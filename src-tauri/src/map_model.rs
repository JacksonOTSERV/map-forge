use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};

use tauri::ipc::Response;

use crate::MapState;

pub(crate) const CHUNK: u32 = 32;

pub(crate) const ACTION_PAINT: u8 = 1;
pub(crate) const ACTION_ERASE: u8 = 2;
pub(crate) const ACTION_MOVE: u8 = 3;
pub(crate) const ACTION_DELETE: u8 = 4;

const UNDO_LIMIT: usize = 200;
const MERGE_WINDOW: Duration = Duration::from_millis(500);

struct TileChange {
	z: u8,
	pos: u32,
	before: Vec<(u16, u16)>,
	after: Vec<(u16, u16)>,
}

#[derive(Default)]
struct History {
	recording: Option<HashMap<(u8, u32), Vec<(u16, u16)>>>,
	undo: Vec<Vec<TileChange>>,
	redo: Vec<Vec<TileChange>>,
	last_kind: u8,
	last_commit: Option<Instant>,
}

pub struct MapModel {
	pub(crate) width: u16,
	pub(crate) height: u16,
	pub(crate) min_x: u16,
	pub(crate) min_y: u16,
	pub(crate) max_x: u16,
	pub(crate) max_y: u16,
	pub(crate) tile_x: Vec<u16>,
	pub(crate) tile_y: Vec<u16>,
	pub(crate) item_off: Vec<u32>,
	pub(crate) client_ids: Vec<u16>,
	pub(crate) server_ids: Vec<u16>,
	pub(crate) floors: HashMap<u8, HashMap<u32, (u32, u32)>>,
	pub(crate) teleports: Vec<u8>,
	pub(crate) teleport_count: u32,
	pub(crate) edits: HashMap<u8, HashMap<u32, HashMap<u32, Vec<(u16, u16)>>>>,
	history: History,
}

#[derive(Default)]
pub struct MapStore {
	pub(crate) maps: HashMap<u32, MapModel>,
	pub(crate) next_id: u32,
}

pub(crate) fn push_u16(out: &mut Vec<u8>, v: u16) {
	out.extend_from_slice(&v.to_le_bytes());
}

pub(crate) fn push_u32(out: &mut Vec<u8>, v: u32) {
	out.extend_from_slice(&v.to_le_bytes());
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn build_map_model(
	width: u16,
	height: u16,
	xs: &[u16],
	ys: &[u16],
	zs: &[u8],
	item_start: &[u32],
	item_count: &[u16],
	client_ids: &[u16],
	server_ids: &[u16],
	teleports: Vec<u8>,
	teleport_count: u32,
) -> MapModel {
	let n = xs.len();
	let mut order: Vec<u32> = (0..n as u32).collect();
	let key = |i: usize| -> u64 {
		let x = xs[i] as u64;
		let y = ys[i] as u64;
		let z = zs[i] as u64;
		let cx = x / CHUNK as u64;
		let cy = y / CHUNK as u64;
		(z << 54) | (cy << 43) | (cx << 32) | (y << 16) | x
	};
	order.sort_unstable_by_key(|&i| key(i as usize));

	let mut min_x = if n == 0 { 0 } else { u16::MAX };
	let mut min_y = if n == 0 { 0 } else { u16::MAX };
	let mut max_x = 0u16;
	let mut max_y = 0u16;
	for i in 0..n {
		min_x = min_x.min(xs[i]);
		min_y = min_y.min(ys[i]);
		max_x = max_x.max(xs[i]);
		max_y = max_y.max(ys[i]);
	}

	let mut tile_x: Vec<u16> = Vec::with_capacity(n);
	let mut tile_y: Vec<u16> = Vec::with_capacity(n);
	let mut item_off: Vec<u32> = Vec::with_capacity(n + 1);
	item_off.push(0);
	let mut client_col: Vec<u16> = Vec::with_capacity(client_ids.len());
	let mut server_col: Vec<u16> = Vec::with_capacity(server_ids.len());
	let mut acc: u32 = 0;
	for &oi in &order {
		let i = oi as usize;
		let s = item_start[i] as usize;
		let c = item_count[i] as usize;
		tile_x.push(xs[i]);
		tile_y.push(ys[i]);
		client_col.extend_from_slice(&client_ids[s..s + c]);
		server_col.extend_from_slice(&server_ids[s..s + c]);
		acc += c as u32;
		item_off.push(acc);
	}

	let mut floors: HashMap<u8, HashMap<u32, (u32, u32)>> = HashMap::new();
	let mut i = 0usize;
	while i < n {
		let z = zs[order[i] as usize];
		let cx = tile_x[i] as u32 / CHUNK;
		let cy = tile_y[i] as u32 / CHUNK;
		let start = i as u32;
		i += 1;
		while i < n && zs[order[i] as usize] == z && tile_x[i] as u32 / CHUNK == cx && tile_y[i] as u32 / CHUNK == cy {
			i += 1;
		}
		floors.entry(z).or_default().insert((cx << 16) | cy, (start, i as u32));
	}

	MapModel {
		width,
		height,
		min_x,
		min_y,
		max_x,
		max_y,
		tile_x,
		tile_y,
		item_off,
		client_ids: client_col,
		server_ids: server_col,
		floors,
		teleports,
		teleport_count,
		edits: HashMap::new(),
		history: History::default(),
	}
}

pub(crate) fn serialize_meta(m: &MapModel) -> Vec<u8> {
	let mut out = Vec::with_capacity(32 + m.teleports.len());
	push_u16(&mut out, m.width);
	push_u16(&mut out, m.height);
	push_u16(&mut out, m.min_x);
	push_u16(&mut out, m.min_y);
	push_u16(&mut out, m.max_x);
	push_u16(&mut out, m.max_y);
	push_u32(&mut out, m.tile_x.len() as u32);
	let mut floors: Vec<u8> = m.floors.keys().copied().collect();
	floors.sort_unstable();
	out.push(floors.len() as u8);
	out.extend_from_slice(&floors);
	push_u32(&mut out, m.teleport_count);
	out.extend_from_slice(&m.teleports);
	out
}

pub(crate) fn serialize_chunks(m: &MapModel, z: u8, keys: &[u32]) -> Vec<u8> {
	let mut out = Vec::new();
	push_u32(&mut out, 0);
	let mut chunk_count = 0u32;
	let floor = m.floors.get(&z);
	let efloor = m.edits.get(&z);
	for &k in keys {
		let base_range = floor.and_then(|f| f.get(&k).copied());
		let edits_chunk = efloor.and_then(|c| c.get(&k));

		let mut tiles: Vec<(u16, u16, Vec<(u16, u16)>)> = Vec::new();
		if let Some((start, end)) = base_range {
			for t in start as usize..end as usize {
				let pos = (m.tile_x[t] as u32) << 16 | m.tile_y[t] as u32;
				if edits_chunk.is_some_and(|c| c.contains_key(&pos)) {
					continue;
				}
				let s = m.item_off[t] as usize;
				let e = m.item_off[t + 1] as usize;
				let items = (s..e).map(|j| (m.client_ids[j], m.server_ids[j])).collect();
				tiles.push((m.tile_x[t], m.tile_y[t], items));
			}
		}
		if let Some(c) = edits_chunk {
			for (&pos, stack) in c {
				if stack.is_empty() {
					continue;
				}
				tiles.push(((pos >> 16) as u16, (pos & 0xFFFF) as u16, stack.clone()));
			}
		}
		if tiles.is_empty() {
			continue;
		}
		tiles.sort_unstable_by_key(|(x, y, _)| (*y, *x));

		push_u16(&mut out, (k >> 16) as u16);
		push_u16(&mut out, (k & 0xFFFF) as u16);
		push_u32(&mut out, tiles.len() as u32);
		for (x, y, items) in &tiles {
			push_u16(&mut out, *x);
			push_u16(&mut out, *y);
			push_u16(&mut out, items.len() as u16);
			for (c, s) in items {
				push_u16(&mut out, *c);
				push_u16(&mut out, *s);
			}
		}
		chunk_count += 1;
	}
	out[0..4].copy_from_slice(&chunk_count.to_le_bytes());
	out
}

pub(crate) fn serialize_minimap(m: &MapModel, z: u8, colors: &[u8]) -> Vec<u8> {
	let pick = |clients: &[u16]| -> u8 {
		for &c in clients.iter().rev() {
			let ci = c as usize;
			if ci < colors.len() && colors[ci] != 0 {
				return colors[ci];
			}
		}
		0
	};

	let mut tiles: Vec<(u16, u16, u8)> = Vec::new();
	let efloor = m.edits.get(&z);
	if let Some(floor) = m.floors.get(&z) {
		for (&k, &(start, end)) in floor {
			let edits_chunk = efloor.and_then(|c| c.get(&k));
			for t in start as usize..end as usize {
				let x = m.tile_x[t];
				let y = m.tile_y[t];
				let pos = (x as u32) << 16 | y as u32;
				if edits_chunk.is_some_and(|c| c.contains_key(&pos)) {
					continue;
				}
				let s = m.item_off[t] as usize;
				let e = m.item_off[t + 1] as usize;
				let col = pick(&m.client_ids[s..e]);
				if col != 0 {
					tiles.push((x, y, col));
				}
			}
		}
	}
	if let Some(chunks) = efloor {
		for chunk in chunks.values() {
			for (&pos, stack) in chunk {
				if stack.is_empty() {
					continue;
				}
				let clients: Vec<u16> = stack.iter().map(|&(c, _)| c).collect();
				let col = pick(&clients);
				if col != 0 {
					tiles.push(((pos >> 16) as u16, (pos & 0xFFFF) as u16, col));
				}
			}
		}
	}

	let mut out = Vec::new();
	if tiles.is_empty() {
		push_u16(&mut out, 0);
		push_u16(&mut out, 0);
		push_u16(&mut out, 0);
		push_u16(&mut out, 0);
		return out;
	}

	let mut min_x = u16::MAX;
	let mut min_y = u16::MAX;
	let mut max_x = 0u16;
	let mut max_y = 0u16;
	for &(x, y, _) in &tiles {
		min_x = min_x.min(x);
		min_y = min_y.min(y);
		max_x = max_x.max(x);
		max_y = max_y.max(y);
	}
	let w = (max_x - min_x + 1) as usize;
	let h = (max_y - min_y + 1) as usize;
	let mut grid = vec![0u8; w * h];
	for &(x, y, col) in &tiles {
		let gx = (x - min_x) as usize;
		let gy = (y - min_y) as usize;
		grid[gy * w + gx] = col;
	}

	out.reserve(8 + grid.len());
	push_u16(&mut out, min_x);
	push_u16(&mut out, min_y);
	push_u16(&mut out, w as u16);
	push_u16(&mut out, h as u16);
	out.extend_from_slice(&grid);
	out
}

pub(crate) fn base_tile_items(m: &MapModel, z: u8, chunk_key: u32, x: u16, y: u16) -> Vec<(u16, u16)> {
	if let Some(&(start, end)) = m.floors.get(&z).and_then(|f| f.get(&chunk_key)) {
		for t in start as usize..end as usize {
			if m.tile_x[t] == x && m.tile_y[t] == y {
				let s = m.item_off[t] as usize;
				let e = m.item_off[t + 1] as usize;
				return (s..e).map(|j| (m.client_ids[j], m.server_ids[j])).collect();
			}
		}
	}
	Vec::new()
}

pub(crate) fn chunk_key_of(x: u16, y: u16) -> u32 {
	((x as u32 / CHUNK) << 16) | (y as u32 / CHUNK)
}

pub(crate) fn stack_at(m: &MapModel, z: u8, x: u16, y: u16) -> Vec<(u16, u16)> {
	let chunk_key = chunk_key_of(x, y);
	let pos = (x as u32) << 16 | y as u32;
	if let Some(stack) = m.edits.get(&z).and_then(|c| c.get(&chunk_key)).and_then(|t| t.get(&pos)) {
		return stack.clone();
	}
	base_tile_items(m, z, chunk_key, x, y)
}

pub(crate) fn tile_stack_mut<'a>(m: &'a mut MapModel, z: u8, x: u16, y: u16) -> &'a mut Vec<(u16, u16)> {
	let chunk_key = chunk_key_of(x, y);
	let pos = (x as u32) << 16 | y as u32;
	if m.history.recording.as_ref().is_some_and(|r| !r.contains_key(&(z, pos))) {
		let snapshot = stack_at(m, z, x, y);
		m.history.recording.as_mut().unwrap().insert((z, pos), snapshot);
	}
	let known = m.edits.get(&z).and_then(|c| c.get(&chunk_key)).is_some_and(|t| t.contains_key(&pos));
	let base = if known { Vec::new() } else { base_tile_items(m, z, chunk_key, x, y) };
	m.edits.entry(z).or_default().entry(chunk_key).or_default().entry(pos).or_insert(base)
}

impl MapModel {
	pub(crate) fn record_begin(&mut self) {
		if self.history.recording.is_none() {
			self.history.recording = Some(HashMap::new());
		}
	}

	pub(crate) fn record_commit(&mut self, kind: u8) {
		let Some(before) = self.history.recording.take() else {
			return;
		};
		let mut changes: Vec<TileChange> = before
			.into_iter()
			.filter_map(|((z, pos), before)| {
				let after = stack_at(self, z, (pos >> 16) as u16, (pos & 0xFFFF) as u16);
				(before != after).then_some(TileChange { z, pos, before, after })
			})
			.collect();
		if changes.is_empty() {
			return;
		}

		let mergeable = matches!(kind, ACTION_PAINT | ACTION_ERASE)
			&& self.history.last_kind == kind
			&& self.history.redo.is_empty()
			&& self.history.last_commit.is_some_and(|t| t.elapsed() < MERGE_WINDOW);

		if mergeable {
			if let Some(group) = self.history.undo.last_mut() {
				for ch in changes.drain(..) {
					match group.iter_mut().find(|c| c.z == ch.z && c.pos == ch.pos) {
						Some(existing) => existing.after = ch.after,
						None => group.push(ch),
					}
				}
			}
		} else {
			self.history.redo.clear();
			self.history.undo.push(changes);
			if self.history.undo.len() > UNDO_LIMIT {
				self.history.undo.remove(0);
			}
		}
		self.history.last_kind = kind;
		self.history.last_commit = Some(Instant::now());
	}

	fn set_overlay(&mut self, z: u8, pos: u32, stack: Vec<(u16, u16)>) {
		let chunk_key = chunk_key_of((pos >> 16) as u16, (pos & 0xFFFF) as u16);
		self.edits.entry(z).or_default().entry(chunk_key).or_default().insert(pos, stack);
	}

	pub(crate) fn undo(&mut self) -> Vec<(u8, u32)> {
		let Some(changes) = self.history.undo.pop() else {
			return Vec::new();
		};
		let touched = self.apply(&changes, true);
		self.history.redo.push(changes);
		self.history.last_commit = None;
		touched
	}

	pub(crate) fn redo(&mut self) -> Vec<(u8, u32)> {
		let Some(changes) = self.history.redo.pop() else {
			return Vec::new();
		};
		let touched = self.apply(&changes, false);
		self.history.undo.push(changes);
		self.history.last_commit = None;
		touched
	}

	fn apply(&mut self, changes: &[TileChange], to_before: bool) -> Vec<(u8, u32)> {
		let mut touched: HashSet<(u8, u32)> = HashSet::new();
		for ch in changes {
			let stack = if to_before { ch.before.clone() } else { ch.after.clone() };
			self.set_overlay(ch.z, ch.pos, stack);
			let chunk_key = chunk_key_of((ch.pos >> 16) as u16, (ch.pos & 0xFFFF) as u16);
			touched.insert((ch.z, chunk_key));
		}
		touched.into_iter().collect()
	}
}

pub(crate) fn store_map(store: &mut MapStore, model: MapModel, meta: Vec<u8>) -> Vec<u8> {
	store.next_id += 1;
	let id = store.next_id;
	store.maps.insert(id, model);
	let mut out = Vec::with_capacity(4 + meta.len());
	out.extend_from_slice(&id.to_le_bytes());
	out.extend_from_slice(&meta);
	out
}

pub(crate) fn empty_model(width: u16, height: u16) -> MapModel {
	MapModel {
		width,
		height,
		min_x: 0,
		min_y: 0,
		max_x: width.saturating_sub(1),
		max_y: height.saturating_sub(1),
		tile_x: Vec::new(),
		tile_y: Vec::new(),
		item_off: vec![0],
		client_ids: Vec::new(),
		server_ids: Vec::new(),
		floors: HashMap::new(),
		teleports: Vec::new(),
		teleport_count: 0,
		edits: HashMap::new(),
		history: History::default(),
	}
}

#[tauri::command]
pub fn new_otbm(width: u16, height: u16, map_state: tauri::State<MapState>) -> Result<Response, String> {
	let model = empty_model(width, height);
	let meta = serialize_meta(&model);
	let mut guard = map_state.lock().map_err(|e| format!("Lock error: {}", e))?;
	Ok(Response::new(store_map(&mut guard, model, meta)))
}

#[tauri::command]
pub fn close_map(map_id: u32, map_state: tauri::State<MapState>) -> Result<(), String> {
	map_state.lock().map_err(|e| format!("Lock error: {}", e))?.maps.remove(&map_id);
	Ok(())
}

#[tauri::command]
pub fn get_map_chunks(map_id: u32, z: u8, keys: Vec<u32>, map_state: tauri::State<MapState>) -> Result<Response, String> {
	let guard = map_state.lock().map_err(|e| format!("Lock error: {}", e))?;
	let model = guard.maps.get(&map_id).ok_or("map not loaded - call open_otbm first")?;
	Ok(Response::new(serialize_chunks(model, z, &keys)))
}

#[tauri::command]
pub fn get_minimap(map_id: u32, z: u8, colors: Vec<u8>, map_state: tauri::State<MapState>) -> Result<Response, String> {
	let guard = map_state.lock().map_err(|e| format!("Lock error: {}", e))?;
	let model = guard.maps.get(&map_id).ok_or("map not loaded - call open_otbm first")?;
	Ok(Response::new(serialize_minimap(model, z, &colors)))
}

#[tauri::command]
pub fn undo_edit(map_id: u32, map_state: tauri::State<MapState>) -> Result<Vec<(u8, u32)>, String> {
	let mut guard = map_state.lock().map_err(|e| format!("Lock error: {}", e))?;
	let m = guard.maps.get_mut(&map_id).ok_or("map not loaded")?;
	Ok(m.undo())
}

#[tauri::command]
pub fn redo_edit(map_id: u32, map_state: tauri::State<MapState>) -> Result<Vec<(u8, u32)>, String> {
	let mut guard = map_state.lock().map_err(|e| format!("Lock error: {}", e))?;
	let m = guard.maps.get_mut(&map_id).ok_or("map not loaded")?;
	Ok(m.redo())
}

#[cfg(test)]
mod tests {
	use super::*;

	fn u16_at(b: &[u8], o: usize) -> u16 {
		u16::from_le_bytes([b[o], b[o + 1]])
	}
	fn u32_at(b: &[u8], o: usize) -> u32 {
		u32::from_le_bytes([b[o], b[o + 1], b[o + 2], b[o + 3]])
	}

	fn sample_model() -> MapModel {
		let xs = vec![40u16, 1, 33, 0];
		let ys = vec![0u16, 1, 5, 0];
		let zs = vec![7u8, 7, 7, 6];
		let item_start = vec![0u32, 1, 2, 4];
		let item_count = vec![1u16, 1, 2, 1];
		let client_ids = vec![100u16, 101, 102, 103, 104];
		let server_ids = vec![900u16, 901, 902, 903, 904];
		build_map_model(10, 20, &xs, &ys, &zs, &item_start, &item_count, &client_ids, &server_ids, Vec::new(), 0)
	}

	#[test]
	fn model_is_sorted_and_chunk_indexed() {
		let m = sample_model();
		assert_eq!(m.tile_x, vec![0, 1, 40, 33]);
		assert_eq!(m.tile_y, vec![0, 1, 0, 5]);
		assert_eq!(m.item_off, vec![0, 1, 2, 3, 5]);
		assert_eq!(&m.client_ids[3..5], &[102, 103]);
		assert_eq!(&m.server_ids[3..5], &[902, 903]);

		assert_eq!(m.floors[&6][&0], (0, 1));
		assert_eq!(m.floors[&7][&0], (1, 2));
		assert_eq!(m.floors[&7][&(1u32 << 16)], (2, 4));
	}

	#[test]
	fn serialize_meta_lists_floors() {
		let m = sample_model();
		let meta = serialize_meta(&m);
		assert_eq!(u16_at(&meta, 0), 10);
		assert_eq!(u16_at(&meta, 8), 40);
		assert_eq!(u16_at(&meta, 10), 5);
		assert_eq!(u32_at(&meta, 12), 4);
		assert_eq!(meta[16], 2);
		assert_eq!(&meta[17..19], &[6, 7]);
		assert_eq!(u32_at(&meta, 19), 0);
	}

	#[test]
	fn serialize_chunks_streams_requested_tiles() {
		let m = sample_model();
		let buf = serialize_chunks(&m, 7, &[1u32 << 16, 999]);
		assert_eq!(u32_at(&buf, 0), 1);
		let mut o = 4;
		assert_eq!(u16_at(&buf, o), 1);
		assert_eq!(u16_at(&buf, o + 2), 0);
		assert_eq!(u32_at(&buf, o + 4), 2);
		o += 8;
		assert_eq!(u16_at(&buf, o), 40);
		assert_eq!(u16_at(&buf, o + 2), 0);
		assert_eq!(u16_at(&buf, o + 4), 1);
		assert_eq!(u16_at(&buf, o + 6), 100);
		assert_eq!(u16_at(&buf, o + 8), 900);
		o += 10;
		assert_eq!(u16_at(&buf, o), 33);
		assert_eq!(u16_at(&buf, o + 2), 5);
		assert_eq!(u16_at(&buf, o + 4), 2);
		assert_eq!(u16_at(&buf, o + 6), 102);
		assert_eq!(u16_at(&buf, o + 10), 103);
	}
}
