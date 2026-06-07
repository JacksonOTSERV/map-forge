import React from 'react';

import { Position } from '~/domain/map';
import { buildItemPreview } from '~/usecase/itemPreview';
import { CHUNK, MOVE_THRESHOLD_SQ } from '~/components/MapCanvas/constants';
import { HoverInfo, HoverItem, MapCanvasProps, ContextMenuState } from '~/components/MapCanvas/types';
import {
  moveItem,
  undoEdit,
  redoEdit,
  eraseArea,
  deleteItem,
  paintTiles,
  previewPaint,
  packChunkKey,
  fetchMapChunks,
  deleteSelection
} from '~/adapter/map';

import { MapScene } from './useMapScene';
import { MapCamera } from './useMapCamera';
import { SpriteAtlas } from './useSpriteAtlas';
import { buildTopItemMesh } from './meshBuilder';
import { ChunkTilesCache } from './useChunkTiles';
import { ChunkMeshCache } from './useChunkMeshes';
import { Selection, BoxSelection } from './useSelection';

export interface InteractionDeps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  camera: MapCamera;
  inputs: React.MutableRefObject<MapCanvasProps>;
  atlas: SpriteAtlas;
  tiles: ChunkTilesCache;
  meshes: ChunkMeshCache;
  selection: Selection;
  scene: MapScene;
}

export function useMapInteraction(deps: InteractionDeps) {
  const { canvasRef, camera, inputs, atlas, tiles, meshes, selection, scene } = deps;

  const [moving, setMoving] = React.useState(false);
  const [boxing, setBoxing] = React.useState(false);
  const [menu, setMenu] = React.useState<ContextMenuState | null>(null);
  const [gotoForm, setGotoForm] = React.useState<Position | null>(null);

  const tileAt = (e: React.MouseEvent) => camera.tileUnderCursor(e, inputs.current.floorZ);

  const previewKey = React.useRef<string | null>(null);
  const previewSeq = React.useRef(0);

  function paintAt(pos: Position) {
    const brush = inputs.current.activeBrush;
    if (!brush || brush.serverId == null) return;
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (key === scene.lastPaintKey.current) return;
    scene.lastPaintKey.current = key;
    paintTiles(
      inputs.current.map.id,
      pos.z,
      [pos.x],
      [pos.y],
      brush.serverId,
      brush.isGround,
      brush.kind === 'doodad',
      inputs.current.automagic
    )
      .then((touched) => {
        if (touched.length === 0) tiles.queueRefetch(pos.x, pos.y, pos.z);
        for (const key of touched) tiles.queueRefetch((key >>> 16) * CHUNK, (key & 0xffff) * CHUNK, pos.z);
      })
      .catch((err) => console.error('Failed to paint tile', err));
  }

  function boxTiles(bs: BoxSelection) {
    const minX = Math.min(bs.startTile.x, bs.curTile.x);
    const maxX = Math.max(bs.startTile.x, bs.curTile.x);
    const minY = Math.min(bs.startTile.y, bs.curTile.y);
    const maxY = Math.max(bs.startTile.y, bs.curTile.y);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        xs.push(x);
        ys.push(y);
      }
    }
    return { xs, ys };
  }

  function paintBox(bs: BoxSelection) {
    const brush = inputs.current.activeBrush;
    if (!brush || brush.serverId == null) return;
    const z = bs.startTile.z;
    const { xs, ys } = boxTiles(bs);
    paintTiles(
      inputs.current.map.id,
      z,
      xs,
      ys,
      brush.serverId,
      brush.isGround,
      brush.kind === 'doodad',
      inputs.current.automagic
    )
      .then((touched) => refetchKeysNow(touched, z))
      .catch((err) => console.error('Failed to paint box', err));
  }

  function eraseBox(bs: BoxSelection) {
    const z = bs.startTile.z;
    const x0 = Math.min(bs.startTile.x, bs.curTile.x);
    const y0 = Math.min(bs.startTile.y, bs.curTile.y);
    const x1 = Math.max(bs.startTile.x, bs.curTile.x);
    const y1 = Math.max(bs.startTile.y, bs.curTile.y);
    eraseArea(inputs.current.map.id, z, x0, y0, x1, y1, inputs.current.automagic)
      .then((touched) => refetchKeysNow(touched, z))
      .catch((err) => console.error('Failed to erase box', err));
  }

  function clearBoxPreview() {
    previewKey.current = null;
    scene.boxGhostTiles.current = null;
  }

  function updateBoxPreview() {
    const bs = selection.box.current;
    const brush = inputs.current.activeBrush;
    if (!bs || inputs.current.activeTool !== 'brush' || !brush || brush.serverId == null || !inputs.current.automagic) {
      clearBoxPreview();
      return;
    }
    const z = bs.startTile.z;
    const { xs, ys } = boxTiles(bs);
    const key = `${z},${brush.serverId},${xs[0]},${ys[0]},${xs[xs.length - 1]},${ys[ys.length - 1]}`;
    if (key === previewKey.current) return;
    previewKey.current = key;
    const seq = ++previewSeq.current;
    previewPaint(inputs.current.map.id, z, xs, ys, brush.serverId, brush.isGround, brush.kind === 'doodad')
      .then((tiles) => {
        if (seq === previewSeq.current) scene.boxGhostTiles.current = tiles;
      })
      .catch((err) => console.error('Failed to preview paint', err));
  }

  function eraseAt(pos: Position) {
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (key === scene.lastPaintKey.current) return;
    scene.lastPaintKey.current = key;
    deleteItem(inputs.current.map.id, pos.z, pos.x, pos.y, inputs.current.automagic)
      .then((touched) => {
        if (touched.length === 0) tiles.queueRefetch(pos.x, pos.y, pos.z);
        for (const key of touched) tiles.queueRefetch((key >>> 16) * CHUNK, (key & 0xffff) * CHUNK, pos.z);
      })
      .catch((err) => console.error('Failed to erase tile', err));
  }

  async function refetchChunkNow(x: number, y: number, z: number) {
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    const key = `${z},${cx},${cy}`;
    const res = await fetchMapChunks(inputs.current.map.id, z, [packChunkKey(cx, cy)]);
    tiles.store(key, res.get(`${cx},${cy}`) ?? null, scene.frameTick.current);
    meshes.forget(key);
  }

  async function refetchKeysNow(keys: number[], z: number) {
    if (keys.length === 0) return;
    const res = await fetchMapChunks(inputs.current.map.id, z, keys);
    for (const k of keys) {
      const cx = k >>> 16;
      const cy = k & 0xffff;
      tiles.store(`${z},${cx},${cy}`, res.get(`${cx},${cy}`) ?? null, scene.frameTick.current);
      meshes.forget(`${z},${cx},${cy}`);
    }
  }

  function hoverAt(pos: Position): HoverInfo {
    const { items, itemNames } = inputs.current;
    const ct = tiles.get(Math.floor(pos.x / CHUNK), Math.floor(pos.y / CHUNK), pos.z, scene.frameTick.current);
    if (ct === undefined) tiles.request(Math.floor(pos.x / CHUNK), Math.floor(pos.y / CHUNK), pos.z);
    let found = -1;
    if (ct) {
      for (let i = 0; i < ct.tileX.length; i++) {
        if (ct.tileX[i] === pos.x && ct.tileY[i] === pos.y) {
          found = i;
          break;
        }
      }
    }
    let item: HoverItem | null = null;
    if (ct && found >= 0) {
      const start = ct.itemOffset[found];
      const end = ct.itemOffset[found + 1];
      const count = end - start;
      if (count > 0) {
        const top = end - 1;
        const clientId = ct.clientIds[top];
        const serverId = ct.serverIds[top];
        const thing = items.get(clientId);
        item = { serverId, clientId, name: itemNames.get(serverId) ?? thing?.marketName ?? '', count };
      }
    }
    return { x: pos.x, y: pos.y, z: pos.z, hasTile: found >= 0, item };
  }

  function finishMove() {
    const md = scene.moveDrag.current;
    scene.moveDrag.current = null;
    if (!md) return;
    setMoving(false);
    const dest = scene.moveDest.current;
    scene.moveDest.current = null;
    if (!md.active || !dest || (dest.x === md.from.x && dest.y === md.from.y)) return;

    const from = md.from;
    const ctx = { items: inputs.current.items, tiles, atlas };
    scene.pendingMove.current = buildTopItemMesh(
      ctx,
      scene.frameTick.current,
      inputs.current.floorZ,
      from,
      dest.x - from.x,
      dest.y - from.y
    );
    moveItem(inputs.current.map.id, from.z, from.x, from.y, dest.x, dest.y, inputs.current.automagic)
      .then((touched) => refetchKeysNow(touched, from.z))
      .then(() => {
        selection.selectTile(dest, false);
        atlas.version.current++;
        inputs.current.onSelect(hoverAt(dest).item);
      })
      .catch((err) => console.error('Failed to move item', err))
      .finally(() => {
        scene.pendingMove.current = null;
      });
  }

  function deleteSelected() {
    const selTiles = [...selection.entries.current.values()];
    if (selTiles.length === 0) return;
    const z = selTiles[0].z;
    const xs = selTiles.map((t) => t.x);
    const ys = selTiles.map((t) => t.y);
    const all = selTiles.map((t) => t.all);
    deleteSelection(inputs.current.map.id, z, xs, ys, all, inputs.current.automagic)
      .then((touched) => {
        selection.clear();
        return refetchKeysNow(touched, z);
      })
      .then(() => {
        atlas.version.current++;
        inputs.current.onSelect(null);
      })
      .catch((err) => console.error('Failed to delete selection', err));
  }

  function applyHistory(pairs: [number, number][]) {
    if (pairs.length === 0) return;
    Promise.all(pairs.map(([z, key]) => refetchChunkNow((key >>> 16) * CHUNK, (key & 0xffff) * CHUNK, z)))
      .then(() => {
        atlas.version.current++;
        const tile = scene.hoveredTile.current;
        if (tile) inputs.current.onSelect(hoverAt(tile).item);
      })
      .catch((err) => console.error('Failed to refresh after history', err));
  }

  function undo() {
    undoEdit(inputs.current.map.id)
      .then(applyHistory)
      .catch((err) => console.error('Undo failed', err));
  }

  function redo() {
    redoEdit(inputs.current.map.id)
      .then(applyHistory)
      .catch((err) => console.error('Redo failed', err));
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 1) {
      e.preventDefault();
      camera.beginPan(e);
      return;
    }
    if (e.button !== 0) return;

    const tool = inputs.current.activeTool;
    const brush = inputs.current.activeBrush;
    const canBrush = tool === 'brush' && brush != null && brush.serverId != null;
    if (e.shiftKey && (tool === 'select' || tool === 'eraser' || canBrush)) {
      const pos = tileAt(e);
      selection.box.current = { startTile: pos, curTile: pos, additive: e.ctrlKey };
      setBoxing(true);
      updateBoxPreview();
      return;
    }
    if (canBrush) {
      scene.painting.current = true;
      scene.lastPaintKey.current = null;
      paintAt(tileAt(e));
      return;
    }
    if (tool === 'eraser') {
      scene.erasing.current = true;
      scene.lastPaintKey.current = null;
      eraseAt(tileAt(e));
      return;
    }

    const pos = tileAt(e);
    selection.selectTile(pos, false);
    scene.moveDest.current = pos;
    scene.moveDrag.current = { from: pos, startX: e.clientX, startY: e.clientY, active: false };
    inputs.current.onSelect(hoverAt(pos).item);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (scene.painting.current) {
      paintAt(tileAt(e));
    } else if (scene.erasing.current) {
      eraseAt(tileAt(e));
    } else if (camera.panMove(e)) {
      // panned
    } else if (selection.box.current) {
      selection.box.current.curTile = tileAt(e);
      updateBoxPreview();
    } else if (scene.moveDrag.current) {
      const md = scene.moveDrag.current;
      if (!md.active) {
        const dx = e.clientX - md.startX;
        const dy = e.clientY - md.startY;
        if (dx * dx + dy * dy > MOVE_THRESHOLD_SQ) {
          md.active = true;
          setMoving(true);
        }
      }
      if (md.active) scene.moveDest.current = tileAt(e);
    }
    const pos = tileAt(e);
    scene.hoveredTile.current = pos;
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (key !== scene.lastHoverKey.current) {
      scene.lastHoverKey.current = key;
      inputs.current.onHover(hoverAt(pos));
    }
  }

  function onMouseUp() {
    const bs = selection.box.current;
    if (bs) {
      selection.box.current = null;
      setBoxing(false);
      clearBoxPreview();
      const tool = inputs.current.activeTool;
      if (tool === 'brush') {
        paintBox(bs);
      } else if (tool === 'eraser') {
        eraseBox(bs);
      } else {
        selection.selectBox(bs.startTile.z, bs.startTile.x, bs.startTile.y, bs.curTile.x, bs.curTile.y, bs.additive);
        inputs.current.onSelect(hoverAt(bs.curTile).item);
      }
    }
    finishMove();
    camera.endPan();
    scene.painting.current = false;
    scene.erasing.current = false;
    scene.lastPaintKey.current = null;
  }

  function onMouseLeave() {
    selection.box.current = null;
    setBoxing(false);
    clearBoxPreview();
    finishMove();
    camera.endPan();
    scene.painting.current = false;
    scene.erasing.current = false;
    scene.lastPaintKey.current = null;
    scene.lastHoverKey.current = null;
    scene.hoveredTile.current = null;
    inputs.current.onHover(null);
  }

  function goTo(pos: Position) {
    camera.centerOn(pos);
    inputs.current.onFloorChange(pos.z);
    setMenu(null);
    setGotoForm(null);
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (!canvasRef.current) return;
    if (inputs.current.activeBrush) inputs.current.onSelectBrush(null);
    if (inputs.current.activeTool !== 'select') inputs.current.onToolChange('select');
    const tile = tileAt(e);
    const info = hoverAt(tile);
    selection.selectTile(tile, false);
    inputs.current.onSelect(info.item);
    const dest = inputs.current.map.teleports.get(`${tile.x},${tile.y},${tile.z}`) ?? null;
    setMenu({ clientX: e.clientX, clientY: e.clientY, tile, dest, item: info.item });
  }

  function selectRaw(item: HoverItem) {
    const thing = inputs.current.items.get(item.clientId);
    inputs.current.onSelectBrush({
      key: `raw-${item.serverId}`,
      name: item.name || `Item ${item.serverId}`,
      kind: 'rawItem',
      serverId: item.serverId,
      isGround: thing?.isGround ?? false,
      cols: thing?.width ?? 1,
      rows: thing?.height ?? 1,
      preview: buildItemPreview(thing, atlas.data.current)
    });
    setMenu(null);
  }

  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('blur', close);
    };
  }, [menu]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === 'Delete' && selection.entries.current.size > 0) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    handlers: { onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onContextMenu },
    moving,
    boxing,
    menu,
    gotoForm,
    selectRaw,
    goTo,
    openGoto: (tile: Position) => {
      setGotoForm(tile);
      setMenu(null);
    },
    closeGoto: () => setGotoForm(null)
  };
}
