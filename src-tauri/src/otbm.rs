const OTBM_MAP_DATA: u8 = 2;
const OTBM_TILE_AREA: u8 = 4;
const OTBM_TILE: u8 = 5;
const OTBM_ITEM: u8 = 6;
const OTBM_HOUSETILE: u8 = 14;

const NODE_START: u8 = 0xFE;
const NODE_END: u8 = 0xFF;
const ESCAPE_CHAR: u8 = 0xFD;

const OTBM_ATTR_TILE_FLAGS: u8 = 3;
const OTBM_ATTR_ITEM: u8 = 9;

// Item attribute ids (OTBM item nodes; attributes have type-specific fixed sizes).
const OTBM_ATTR_DESCRIPTION: u8 = 1;
const OTBM_ATTR_ACTION_ID: u8 = 4;
const OTBM_ATTR_UNIQUE_ID: u8 = 5;
const OTBM_ATTR_TEXT: u8 = 6;
const OTBM_ATTR_DESC: u8 = 7;
const OTBM_ATTR_TELE_DEST: u8 = 8;
const OTBM_ATTR_DEPOT_ID: u8 = 10;
const OTBM_ATTR_RUNE_CHARGES: u8 = 12;
const OTBM_ATTR_HOUSEDOORID: u8 = 14;
const OTBM_ATTR_COUNT: u8 = 15;
const OTBM_ATTR_CHARGES: u8 = 22;
const OTBM_ATTR_TIER: u8 = 41;

/// Sink for the streaming parser. The parser never materializes a node tree; it walks the
/// escaped byte stream once and pushes tiles/teleports here as they are decoded. `items` in
/// `tile` borrows a scratch buffer that is overwritten on the next tile - copy what you keep.
pub trait OtbmVisitor {
	fn header(&mut self, width: u16, height: u16);
	/// Called at the start of each tile area; `pos`/`total` are byte offsets for progress.
	fn progress(&mut self, pos: usize, total: usize);
	fn tile(&mut self, x: u16, y: u16, z: u8, items: &[u16]);
	fn teleport(&mut self, sx: u16, sy: u16, sz: u8, dx: u16, dy: u16, dz: u8);
}

/// Cursor over the escaped node stream. `data_*` readers transparently unescape `0xFD`
/// and stop (returning `None`) when a structural byte (`0xFE`/`0xFF`) is reached.
struct Reader<'a> {
	b: &'a [u8],
	pos: usize,
}

impl<'a> Reader<'a> {
	fn peek(&self) -> Option<u8> {
		self.b.get(self.pos).copied()
	}

	fn data_u8(&mut self) -> Option<u8> {
		let b = *self.b.get(self.pos)?;
		if b == NODE_START || b == NODE_END {
			return None;
		}
		self.pos += 1;
		if b == ESCAPE_CHAR {
			let lit = *self.b.get(self.pos)?;
			self.pos += 1;
			Some(lit)
		} else {
			Some(b)
		}
	}

	fn data_u16(&mut self) -> Option<u16> {
		Some(u16::from_le_bytes([self.data_u8()?, self.data_u8()?]))
	}

	fn data_u32(&mut self) -> Option<u32> {
		Some(u32::from_le_bytes([self.data_u8()?, self.data_u8()?, self.data_u8()?, self.data_u8()?]))
	}

	fn skip_data(&mut self, n: usize) -> bool {
		for _ in 0..n {
			if self.data_u8().is_none() {
				return false;
			}
		}
		true
	}

	/// Advance past any remaining payload bytes of the current node up to its next structural byte.
	fn skip_to_structural(&mut self) {
		while let Some(b) = self.peek() {
			if b == NODE_START || b == NODE_END {
				break;
			}
			self.pos += 1;
			if b == ESCAPE_CHAR {
				self.pos += 1;
			}
		}
	}
}

struct Parser<'a, V: OtbmVisitor> {
	r: Reader<'a>,
	v: &'a mut V,
	total: usize,
	scratch: Vec<u16>,
}

impl<'a, V: OtbmVisitor> Parser<'a, V> {
	fn run(&mut self) -> Result<(), String> {
		if self.r.b.len() < 6 {
			return Err("otbm: file too small to be a node-tree".into());
		}
		self.r.pos = 4;
		if self.r.peek() != Some(NODE_START) {
			return Err("otbm: missing root node start byte".into());
		}
		self.r.pos += 1;

		// Root payload: [type u8][version u32][width u16][height u16][items_major u32][items_minor u32]
		self.r.data_u8().ok_or("otbm: missing root type")?;
		self.r.data_u32().ok_or("otbm: missing version")?;
		let width = self.r.data_u16().ok_or("otbm: missing width")?;
		let height = self.r.data_u16().ok_or("otbm: missing height")?;
		self.v.header(width, height);
		self.r.skip_to_structural();

		// Root children: the single OTBM_MAP_DATA node (others, if any, are skipped).
		self.each_child(|p| {
			let kind = p.r.data_u8().ok_or("otbm: missing node type")?;
			if kind == OTBM_MAP_DATA {
				p.map_data()
			} else {
				p.skip_subtree()
			}
		})
	}

	fn map_data(&mut self) -> Result<(), String> {
		self.r.skip_to_structural(); // map attributes (description, spawn/house files)
		self.each_child(|p| {
			let kind = p.r.data_u8().ok_or("otbm: missing node type")?;
			if kind == OTBM_TILE_AREA {
				p.tile_area()
			} else {
				p.skip_subtree()
			}
		})
	}

	fn tile_area(&mut self) -> Result<(), String> {
		let base_x = self.r.data_u16().ok_or("otbm: tile area missing base x")?;
		let base_y = self.r.data_u16().ok_or("otbm: tile area missing base y")?;
		let base_z = self.r.data_u8().ok_or("otbm: tile area missing base z")?;
		self.r.skip_to_structural();
		self.v.progress(self.r.pos, self.total);
		self.each_child(|p| {
			let kind = p.r.data_u8().ok_or("otbm: missing node type")?;
			if kind == OTBM_TILE || kind == OTBM_HOUSETILE {
				p.tile(kind == OTBM_HOUSETILE, base_x, base_y, base_z)
			} else {
				p.skip_subtree()
			}
		})
	}

	fn tile(&mut self, house: bool, base_x: u16, base_y: u16, base_z: u8) -> Result<(), String> {
		let dx = self.r.data_u8().ok_or("otbm: tile missing dx")?;
		let dy = self.r.data_u8().ok_or("otbm: tile missing dy")?;
		if house {
			self.r.data_u32();
		}
		let tile_x = base_x.wrapping_add(dx as u16);
		let tile_y = base_y.wrapping_add(dy as u16);
		self.scratch.clear();

		// Inline tile attributes (ground item lives here). An unknown attribute has no known
		// size, so we stop walking - the rest of the payload is skipped before the child loop.
		while let Some(attr) = self.r.data_u8() {
			match attr {
				OTBM_ATTR_TILE_FLAGS => {
					if self.r.data_u32().is_none() {
						break;
					}
				}
				OTBM_ATTR_ITEM => match self.r.data_u16() {
					Some(id) => self.scratch.push(id),
					None => break,
				},
				_ => break,
			}
		}
		self.r.skip_to_structural();

		// Stacked items are child item nodes (bottom-to-top). Nested item children (container
		// contents) are skipped by tile_item so they never land on the map tile.
		self.each_child(|p| {
			let kind = p.r.data_u8().ok_or("otbm: missing node type")?;
			if kind == OTBM_ITEM {
				p.tile_item(tile_x, tile_y, base_z)
			} else {
				p.skip_subtree()
			}
		})?;

		let items = std::mem::take(&mut self.scratch);
		self.v.tile(tile_x, tile_y, base_z, &items);
		self.scratch = items;
		Ok(())
	}

	fn tile_item(&mut self, tile_x: u16, tile_y: u16, base_z: u8) -> Result<(), String> {
		let id = self.r.data_u16().ok_or("otbm: item missing id")?;
		self.scratch.push(id);

		// Walk item attributes by known fixed size to capture a teleport destination; an
		// unknown attribute stops the walk (its size is unknown), forgoing only teleport detection.
		while let Some(attr) = self.r.data_u8() {
			let ok = match attr {
				OTBM_ATTR_COUNT | OTBM_ATTR_TIER | OTBM_ATTR_HOUSEDOORID | OTBM_ATTR_RUNE_CHARGES => self.r.skip_data(1),
				OTBM_ATTR_ACTION_ID | OTBM_ATTR_UNIQUE_ID | OTBM_ATTR_CHARGES | OTBM_ATTR_DEPOT_ID => self.r.skip_data(2),
				OTBM_ATTR_TEXT | OTBM_ATTR_DESC | OTBM_ATTR_DESCRIPTION => match self.r.data_u16() {
					Some(len) => self.r.skip_data(len as usize),
					None => false,
				},
				OTBM_ATTR_TELE_DEST => {
					if let (Some(dx), Some(dy), Some(dz)) = (self.r.data_u16(), self.r.data_u16(), self.r.data_u8()) {
						self.v.teleport(tile_x, tile_y, base_z, dx, dy, dz);
					}
					false
				}
				_ => false,
			};
			if !ok {
				break;
			}
		}
		self.skip_subtree() // skip payload remainder + any container children
	}

	/// Consume the current node's payload remainder and all of its child subtrees.
	fn skip_subtree(&mut self) -> Result<(), String> {
		self.r.skip_to_structural();
		self.each_child(|p| {
			p.r.data_u8(); // node type, ignored
			p.skip_subtree()
		})
	}

	/// Iterate child nodes until this node's `NODE_END`. `pos` sits just past the parent's
	/// last payload byte (a structural byte) on entry. `f` runs once per child, just past its
	/// `NODE_START`, and must fully consume the child including its terminating `NODE_END`.
	fn each_child(&mut self, mut f: impl FnMut(&mut Self) -> Result<(), String>) -> Result<(), String> {
		loop {
			match self.r.peek() {
				Some(NODE_END) => {
					self.r.pos += 1;
					return Ok(());
				}
				Some(NODE_START) => {
					self.r.pos += 1;
					f(self)?;
				}
				Some(_) => return Err("otbm: expected node boundary".into()),
				None => return Err("otbm: premature end of node-tree".into()),
			}
		}
	}
}

/// Stream a parsed OTBM into `visitor` in a single pass over `bytes`.
pub fn read_otbm<V: OtbmVisitor>(bytes: &[u8], visitor: &mut V) -> Result<(), String> {
	let mut parser = Parser {
		r: Reader { b: bytes, pos: 0 },
		v: visitor,
		total: bytes.len(),
		scratch: Vec::new(),
	};
	parser.run()
}
