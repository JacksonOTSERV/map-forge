import React from 'react';
import { createRoot } from 'react-dom/client';
import { open } from '@tauri-apps/plugin-dialog';
import {
  useSensor,
  DndContext,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragMoveEvent,
  pointerWithin,
  PointerSensor,
  DragStartEvent
} from '@dnd-kit/core';

import { ToolId } from '~/domain/tools';
import { cn } from '~/usecase/classNames';
import Toolbar from '~/components/Toolbar';
import MapTabs from '~/components/MapTabs';
import StatusBar from '~/components/StatusBar';
import MapCanvas from '~/components/MapCanvas';
import { MapMeta, MapView } from '~/domain/map';
import Resizer from '~/components/Dock/Resizer';
import { loadPalette } from '~/adapter/palette';
import ToolsPanel from '~/components/ToolsPanel';
import Preferences from '~/components/Preferences';
import PalettePanel from '~/components/PalettePanel';
import CornerPanel from '~/components/Dock/CornerPanel';
import { loadGeneralConfig } from '~/adapter/preferences';
import Minimap, { MinimapApi } from '~/components/Minimap';
import { newOtbm, openOtbm, closeMap } from '~/adapter/map';
import { getSetting, setSetting } from '~/adapter/settings';
import FloatingPanel from '~/components/Dock/FloatingPanel';
import PanelDockMenu from '~/components/Dock/PanelDockMenu';
import DockablePanel from '~/components/Dock/DockablePanel';
import { ActiveBrush, PaletteData } from '~/domain/palette';
import { MIN_ZOOM, MAX_ZOOM, snapZoom } from '~/usecase/zoom';
import { DragHandleProps } from '~/components/Dock/DockablePanel';
import { HoverInfo, HoverItem } from '~/components/MapCanvas/types';
import { loadAssets, LoadedAssets, DEFAULT_DATA_DIR } from '~/adapter/assets';
import { addRecentMap, loadRecentMaps, clearRecentMaps } from '~/adapter/recentMaps';
import {
  PANELS,
  PanelId,
  DockZone,
  MapCorner,
  FloatRect,
  ResizeSide,
  DropTarget,
  DockLayout,
  CORNER_MARGIN,
  DEFAULT_MAX_STACK,
  DEFAULT_FLOAT_WIDTH,
  DEFAULT_MINIMAP_SIZE,
  DEFAULT_FLOAT_HEIGHT
} from '~/domain/dock';
import {
  zoneOf,
  locate,
  dockAt,
  floatAt,
  heightOf,
  cornerOf,
  isFloating,
  dockCorner,
  removePanel,
  resizeFloat,
  floatRectOf,
  resizeColumn,
  resizeHeight,
  resizeCorner,
  canStackInto,
  columnWidthOf,
  loadDockLayout,
  saveDockLayout,
  defaultDockLayout,
  clampFloatsToBounds
} from '~/usecase/dock';

import './styles/index.css';

const NEW_MAP_WIDTH = 1024;
const NEW_MAP_HEIGHT = 1024;

interface MapTab {
  id: string;
  title: string;
  map: MapMeta;
  floorZ: number;
  zoom: number;
}

let tabSeq = 0;

interface ColGeom {
  left: number;
  right: number;
  panelY: number[];
}

interface DragGeom {
  zones: Record<DockZone, { top: number; h: number; cols: (ColGeom | null)[] }>;
}

const DropPlaceholder = ({ vertical, size, animate }: { vertical: boolean; size: number; animate: boolean }) => {
  const [open, setOpen] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return;
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [animate]);
  return (
    <div
      style={vertical ? { height: open ? size : 0 } : { width: open ? size : 0 }}
      className={cn(
        'flex-shrink-0 overflow-hidden rounded-lg bg-primary/15 ring-1 ring-inset ring-primary/40',
        animate && 'duration-200 ease-out',
        vertical ? 'w-full' : 'h-full',
        animate && (vertical ? 'transition-[height]' : 'transition-[width]')
      )}
    />
  );
};

const sameTarget = (a: DropTarget | null, b: DropTarget | null) =>
  !!a && !!b && a.zone === b.zone && a.col === b.col && a.row === b.row;

const App = () => {
  const [assets, setAssets] = React.useState<LoadedAssets | null>(null);
  const [palette, setPalette] = React.useState<PaletteData | null>(null);
  const [activeBrush, setActiveBrush] = React.useState<ActiveBrush | null>(null);
  const [activeTool, setActiveTool] = React.useState<ToolId>('select');
  const [automagic, setAutomagic] = React.useState(true);
  const [status, setStatus] = React.useState('Loading client assets...');
  const [error, setError] = React.useState<string | null>(null);
  const [tabs, setTabs] = React.useState<MapTab[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [preferencesOpen, setPreferencesOpen] = React.useState(false);
  const [minimapOpen, setMinimapOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ value: number; label: string } | null>(null);
  const [hover, setHover] = React.useState<HoverInfo | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<HoverItem | null>(null);
  const [layout, setLayout] = React.useState<DockLayout>(defaultDockLayout);
  const [maxStack, setMaxStack] = React.useState(DEFAULT_MAX_STACK);
  const [dragging, setDragging] = React.useState<PanelId | null>(null);
  const [resizing, setResizing] = React.useState(false);
  const [dragSize, setDragSize] = React.useState<{ width: number; height: number } | null>(null);
  const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null);

  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const mapAreaRef = React.useRef<HTMLDivElement>(null);
  const mapViewRef = React.useRef<MapView | null>(null);
  const minimapApiRef = React.useRef<MinimapApi | null>(null);
  const mapCenterRef = React.useRef<((x: number, y: number) => void) | null>(null);
  const dragGeom = React.useRef<DragGeom | null>(null);
  const origTarget = React.useRef<DropTarget | null>(null);
  const dragOrigin = React.useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const active = tabs.find((t) => t.id === activeId) ?? null;

  const minimapColors = React.useMemo(() => {
    if (!assets) return null;
    let max = 0;
    for (const id of assets.items.keys()) if (id > max) max = id;
    const arr = new Array<number>(max + 1).fill(0);
    for (const [id, thing] of assets.items) if (thing.miniMap && thing.miniMapColor) arr[id] = thing.miniMapColor & 0xff;
    return arr;
  }, [assets]);

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as PanelId;
    const el = document.querySelector(`[data-panel-id="${id}"]`);
    const rect = el?.getBoundingClientRect();
    dragOrigin.current = { left: rect?.left ?? 0, top: rect?.top ?? 0 };
    dragGeom.current = null;
    const loc = locate(layout, id);
    const orig = loc ? { zone: loc.zone, col: loc.col, row: layout[loc.zone][loc.col].length > 1 ? loc.row : null } : null;
    origTarget.current = orig;
    setDragSize(rect ? { width: rect.width, height: rect.height } : null);
    setDragging(id);
    setDropTarget(orig);
  }

  function handleDragMove(event: DragMoveEvent) {
    setDropTarget(findDropTarget(event.active.id as PanelId, event.delta));
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = event.active.id as PanelId;
    const target = findDropTarget(id, event.delta);
    dragGeom.current = null;
    setDragging(null);
    setDropTarget(null);
    setLayout((prev) => {
      const next = target ? dockAt(prev, id, target, maxStack) : floatAt(prev, id, dropRect(prev, id, event.delta));
      saveDockLayout(next);
      return next;
    });
  }

  function buildDragGeom(lay: DockLayout): DragGeom {
    const ws = workspaceRef.current!.getBoundingClientRect();
    const zones = {} as DragGeom['zones'];
    for (const zone of ['left', 'right'] as DockZone[]) {
      const zr = document.querySelector(`[data-dock-zone="${zone}"]`)?.getBoundingClientRect() ?? null;
      const cols = lay[zone].map((col, ci) => {
        const cr = document.querySelector(`[data-dock-col="${zone}:${ci}"]`)?.getBoundingClientRect();
        if (!cr) return null;
        const pr = col
          .map((id) => document.querySelector(`[data-panel-id="${id}"]`)?.getBoundingClientRect() ?? null)
          .filter((r): r is DOMRect => !!r);
        const panelY = pr.length ? [pr[0].top, ...pr.map((r) => r.bottom)] : [cr.top, cr.bottom];
        return { left: cr.left, right: cr.right, panelY };
      });
      zones[zone] = { top: zr ? zr.top : ws.top + 6, h: (zr ? zr.height : ws.height - 12) || ws.height - 12, cols };
    }
    return { zones };
  }

  function findDropTarget(dragId: PanelId, delta: { x: number; y: number }): DropTarget | null {
    const ws = workspaceRef.current?.getBoundingClientRect();
    if (!ws) return null;
    const lay = removePanel(layout, dragId);
    if (!dragGeom.current) dragGeom.current = buildDragGeom(lay);
    const geom = dragGeom.current;
    const size = dragSize ?? { width: DEFAULT_FLOAT_WIDTH, height: DEFAULT_FLOAT_HEIGHT };
    const cx = dragOrigin.current.left + delta.x + size.width / 2;
    const cy = dragOrigin.current.top + delta.y + size.height / 2;
    const SNAP = 260;

    let best: { t: DropTarget; d: number } | null = null;
    const add = (t: DropTarget, px: number, py: number) => {
      const d = Math.hypot(px - cx, py - cy);
      if (d < SNAP && (!best || d < best.d)) best = { t, d };
    };

    for (const zone of ['left', 'right'] as DockZone[]) {
      const z = geom.zones[zone];
      const cols = lay[zone];
      const midY = z.top + z.h / 2;

      if (cols.length === 0) {
        add({ zone, col: 0, row: null }, zone === 'left' ? ws.left + size.width / 2 : ws.right - size.width / 2, midY);
        continue;
      }

      for (let ci = 0; ci <= cols.length; ci++) {
        const before = ci > 0 ? z.cols[ci - 1] : null;
        const after = ci < cols.length ? z.cols[ci] : null;
        let gx: number;
        if (ci === 0) gx = after ? after.left : ws.left;
        else if (ci === cols.length) gx = before ? before.right : ws.right;
        else gx = before && after ? (before.right + after.left) / 2 : (after?.left ?? before?.right ?? ws.left);
        add({ zone, col: ci, row: null }, gx, midY);
      }

      for (let ci = 0; ci < cols.length; ci++) {
        const cg = z.cols[ci];
        if (!cg || !canStackInto(cols[ci], dragId, maxStack)) continue;
        const colMidX = (cg.left + cg.right) / 2;
        for (let ri = 0; ri < cg.panelY.length; ri++) add({ zone, col: ci, row: ri }, colMidX, cg.panelY[ri]);
      }
    }

    return best ? best.t : null;
  }

  function resizeColumnWidth(zone: DockZone, ci: number, dx: number) {
    const dir = zone === 'left' ? 1 : -1;
    setLayout((prev) => {
      const next = resizeColumn(prev, zone, ci, columnWidthOf(prev, zone, ci) + dir * dx);
      saveDockLayout(next);
      return next;
    });
  }

  function resizePanelHeight(id: PanelId, dy: number) {
    setLayout((prev) => {
      const next = resizeHeight(prev, id, heightOf(prev, id) + dy);
      saveDockLayout(next);
      return next;
    });
  }

  function resizeFloatPanel(id: PanelId, side: ResizeSide, dx: number, dy: number) {
    const ws = workspaceRef.current?.getBoundingClientRect();
    const bounds = ws ? { width: ws.width, height: ws.height } : undefined;
    setLayout((prev) => {
      const next = resizeFloat(prev, id, side, dx, dy, bounds);
      saveDockLayout(next);
      return next;
    });
  }

  function resetLayout() {
    const next = floatAt(defaultDockLayout(), 'minimap', defaultMinimapRect());
    saveDockLayout(next);
    setLayout(next);
  }

  function dockToCorner(id: PanelId, corner: MapCorner) {
    setLayout((prev) => {
      const next = dockCorner(prev, id, corner);
      saveDockLayout(next);
      return next;
    });
  }

  function floatPanel(id: PanelId) {
    setLayout((prev) => {
      const ws = workspaceRef.current?.getBoundingClientRect();
      const w = prev.width[id] ?? DEFAULT_MINIMAP_SIZE;
      const h = prev.height[id] ?? DEFAULT_MINIMAP_SIZE;
      const rect = floatRectOf(prev, id) ?? {
        width: w,
        height: h,
        x: ws ? Math.max(8, ws.width - w - 16) : 480,
        y: ws ? Math.max(8, ws.height - h - 16) : 360
      };
      const next = floatAt(prev, id, rect);
      saveDockLayout(next);
      return next;
    });
  }

  function resizeCornerPanel(id: PanelId, corner: MapCorner, side: ResizeSide, dx: number, dy: number) {
    const area = mapAreaRef.current?.getBoundingClientRect();
    const bounds = area ? { width: area.width - 2 * CORNER_MARGIN, height: area.height - 2 * CORNER_MARGIN } : undefined;
    setLayout((prev) => {
      const next = resizeCorner(prev, id, corner, side, dx, dy, bounds);
      saveDockLayout(next);
      return next;
    });
  }

  function panelMenu(id: PanelId) {
    if (!PANELS[id].cornerDockable) return null;
    return <PanelDockMenu corner={cornerOf(layout, id)} onFloat={() => floatPanel(id)} onPick={(c) => dockToCorner(id, c)} />;
  }

  function dropRect(layout: DockLayout, id: PanelId, delta: { x: number; y: number }): FloatRect {
    const ws = workspaceRef.current?.getBoundingClientRect();
    const prev = floatRectOf(layout, id);
    const width = dragSize?.width ?? DEFAULT_FLOAT_WIDTH;
    const height = prev ? (dragSize?.height ?? DEFAULT_FLOAT_HEIGHT) : DEFAULT_FLOAT_HEIGHT;
    const rawX = dragOrigin.current.left + delta.x - (ws?.left ?? 0);
    const rawY = dragOrigin.current.top + delta.y - (ws?.top ?? 0);
    const x = Math.max(0, Math.min(rawX, (ws?.width ?? width) - width));
    const y = Math.max(0, Math.min(rawY, (ws?.height ?? height) - height));
    return { x, y, width, height };
  }

  function defaultMinimapRect(): FloatRect {
    const ws = workspaceRef.current?.getBoundingClientRect();
    const size = DEFAULT_MINIMAP_SIZE;
    const x = ws ? Math.max(8, ws.width - size - 16) : 480;
    const y = ws ? Math.max(8, ws.height - size - 16) : 360;
    return { x, y, width: size, height: size };
  }

  React.useEffect(() => {
    void (async () => {
      const loaded = await loadDockLayout();
      const reset = await getSetting('minimapReset', false);
      const placed = !!zoneOf(loaded, 'minimap') || isFloating(loaded, 'minimap');
      if (reset && placed) {
        setLayout(loaded);
        return;
      }
      const next = floatAt(loaded, 'minimap', defaultMinimapRect());
      saveDockLayout(next);
      if (!reset) void setSetting('minimapReset', true);
      setLayout(next);
    })();
  }, []);

  React.useEffect(() => {
    void getSetting('automagic', true).then(setAutomagic);
  }, []);

  React.useEffect(() => {
    void getSetting('minimapOpen', false).then(setMinimapOpen);
  }, []);

  React.useEffect(() => {
    void loadGeneralConfig().then((g) => setMaxStack(g.maxStack));
  }, []);

  React.useEffect(() => {
    const onResize = () => {
      const ws = workspaceRef.current?.getBoundingClientRect();
      if (!ws) return;
      setLayout((prev) => {
        const next = clampFloatsToBounds(prev, { width: ws.width, height: ws.height });
        if (next !== prev) saveDockLayout(next);
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    void loadRecentMaps().then(setRecent);
  }, []);

  const clearRecent = () => {
    void clearRecentMaps().then(() => setRecent([]));
  };

  const toggleAutomagic = () =>
    setAutomagic((v) => {
      const next = !v;
      void setSetting('automagic', next);
      return next;
    });

  const toggleMinimap = () =>
    setMinimapOpen((v) => {
      const next = !v;
      void setSetting('minimapOpen', next);
      return next;
    });

  const closeMinimap = () => {
    setMinimapOpen(false);
    void setSetting('minimapOpen', false);
  };

  React.useEffect(() => {
    setSelectedItem(null);
  }, [activeId]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        void handleNew();
      } else if (key === 'o') {
        e.preventDefault();
        void handleOpen();
      } else if (key === 'w' && activeId) {
        e.preventDefault();
        closeTab(activeId);
      } else if (key === ',') {
        e.preventDefault();
        setPreferencesOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assets, busy, tabs, activeId]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMinimap();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateActive = (patch: Partial<MapTab>) =>
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, ...patch } : t)));

  const setFloorZ = (z: number) => updateActive({ floorZ: z });
  const setZoom = (z: number) => updateActive({ zoom: snapZoom(z) });

  function addTab(title: string, data: MapMeta) {
    const id = `tab-${++tabSeq}`;
    setTabs((prev) => [...prev, { id, title, map: data, floorZ: 7, zoom: 1 }]);
    setActiveId(id);
  }

  function closeTab(id: string) {
    const idx = tabs.findIndex((t) => t.id === id);
    const tab = tabs[idx];
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (tab) void closeMap(tab.map.id).catch(() => undefined);
    if (id === activeId) setActiveId(next[idx]?.id ?? next[idx - 1]?.id ?? null);
  }

  React.useEffect(() => {
    loadAssets()
      .then((a) => {
        setAssets(a);
        setStatus(`Assets ready - ${a.otbItemCount} items, ${a.spritesCount} sprites. Open a map to begin.`);
      })
      .catch((e) => {
        setError(`Failed to load assets: ${e}`);
        setStatus('Asset load failed');
      });
  }, []);

  React.useEffect(() => {
    if (!assets) return;
    loadPalette()
      .then(setPalette)
      .catch((e) => setError(`Failed to load palette: ${e}`));
  }, [assets]);

  async function openPath(path: string) {
    if (!assets) return;
    setBusy(true);
    setProgress({ value: 0, label: 'Reading map...' });
    setStatus('Reading map...');
    try {
      const data = await openOtbm(path, (_phase, value) => {
        setProgress({ value, label: 'Reading map...' });
      });
      const name = path.split(/[\\/]/).pop() ?? 'map.otbm';
      addTab(name, data);
      const dims = `${data.bounds.minX}..${data.bounds.maxX} x ${data.bounds.minY}..${data.bounds.maxY}`;
      setStatus(`${name} - ${data.tileCount} tiles - ${dims} - ${data.width}x${data.height}`);
      void addRecentMap(path).then(setRecent);
    } catch (e) {
      setError(`Failed to open map: ${e}`);
      setStatus('Map load failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleOpen() {
    if (!assets) return;
    const selected = await open({
      multiple: false,
      defaultPath: DEFAULT_DATA_DIR,
      title: 'Open OTBM map',
      filters: [{ name: 'OTBM Maps', extensions: ['otbm'] }]
    });
    if (!selected || typeof selected !== 'string') return;
    await openPath(selected);
  }

  async function handleNew() {
    if (!assets) return;
    setBusy(true);
    setStatus('Creating map...');
    try {
      const data = await newOtbm(NEW_MAP_WIDTH, NEW_MAP_HEIGHT);
      const used = new Set(tabs.map((t) => t.title));
      let n = 1;
      while (used.has(`untitled-${n}`)) n++;
      addTab(`untitled-${n}`, data);
      setError(null);
      setStatus(`New map - ${data.width}x${data.height}`);
    } catch (e) {
      setError(`Failed to create map: ${e}`);
      setStatus('Map create failed');
    } finally {
      setBusy(false);
    }
  }

  const isRenderable = (id: PanelId) => {
    if (id === dragging) return false;
    if (id === 'minimap') return minimapOpen && !!assets && !!active && !!minimapColors;
    return id === 'tools' || !!(assets && palette);
  };
  const isStrip = (id: PanelId) => PANELS[id].variant === 'strip';
  const guard = !!dragging || resizing;
  const dragLayout = dragging ? removePanel(layout, dragging) : layout;
  const floating = (Object.keys(PANELS) as PanelId[]).filter((id) => isFloating(dragLayout, id) && isRenderable(id));
  const cornered = (Object.keys(PANELS) as PanelId[]).filter((id) => !!cornerOf(dragLayout, id) && isRenderable(id));

  function selectBrush(brush: ActiveBrush | null) {
    setActiveBrush(brush);
    setActiveTool(brush ? 'brush' : 'select');
  }

  function renderPanel(id: PanelId, handle?: DragHandleProps) {
    if (id === 'tools') {
      return (
        <ToolsPanel
          dragHandle={handle}
          automagic={automagic}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onToggleAutomagic={toggleAutomagic}
        />
      );
    }
    if (id === 'palette' && assets && palette) {
      return (
        <PalettePanel
          data={palette}
          dragHandle={handle}
          items={assets.items}
          outfits={assets.outfits}
          sprPath={assets.sprPath}
          onSelectBrush={selectBrush}
          transparency={assets.transparency}
        />
      );
    }
    if (id === 'minimap' && assets && active && minimapColors) {
      return (
        <Minimap
          key={active.id}
          dragHandle={handle}
          viewRef={mapViewRef}
          mapId={active.map.id}
          floorZ={active.floorZ}
          colors={minimapColors}
          apiRef={minimapApiRef}
          onClose={closeMinimap}
          centerRef={mapCenterRef}
          headerMenu={panelMenu('minimap')}
        />
      );
    }
    return null;
  }

  function renderStackItem(id: PanelId, ri: number, count: number) {
    const last = ri === count - 1;
    const strip = isStrip(id);
    return (
      <div
        key={id}
        className={cn('relative min-h-0', last ? 'flex-1' : 'flex-shrink-0')}
        style={last || strip ? undefined : { height: heightOf(dragLayout, id) }}
      >
        <DockablePanel guarded={guard} meta={PANELS[id]} className="h-full">
          {(handle) => renderPanel(id, handle)}
        </DockablePanel>
        {!last && (
          <Resizer
            gap
            dir="y"
            side="bottom"
            onResizeEnd={() => setResizing(false)}
            onResizeStart={() => setResizing(true)}
            onResize={({ dy }) => resizePanelHeight(id, dy)}
          />
        )}
      </div>
    );
  }

  function renderColumn(zone: DockZone, ci: number, panels: PanelId[], rowPh: number, animate: boolean) {
    const strip = panels.length === 1 && isStrip(panels[0]);
    const fullH = dragSize?.height ?? DEFAULT_FLOAT_HEIGHT;
    const items: React.ReactNode[] = [];
    for (let ri = 0; ri <= panels.length; ri++) {
      if (ri === rowPh) {
        items.push(
          <DropPlaceholder vertical animate={animate} key={`ph-${zone}-${ci}`} size={animate ? Math.min(fullH, 200) : fullH} />
        );
      }
      if (ri < panels.length) items.push(renderStackItem(panels[ri], ri, panels.length));
    }
    return (
      <div
        key={`col-${zone}-${ci}`}
        data-dock-col={`${zone}:${ci}`}
        className="relative flex h-full min-h-0 flex-shrink-0 flex-col gap-1.5"
        style={strip ? undefined : { width: columnWidthOf(dragLayout, zone, ci) }}
      >
        {items}
        {!strip && (
          <Resizer
            gap
            dir="x"
            onResizeEnd={() => setResizing(false)}
            onResizeStart={() => setResizing(true)}
            side={zone === 'left' ? 'right' : 'left'}
            onResize={({ dx }) => resizeColumnWidth(zone, ci, dx)}
          />
        )}
      </div>
    );
  }

  function renderSide(zone: DockZone) {
    const cols = dragLayout[zone];
    const dt = dropTarget;
    const animate = !sameTarget(dt, origTarget.current);
    const newCol = dt && dt.zone === zone && dt.row === null ? dt.col : -1;
    const children: React.ReactNode[] = [];
    for (let ci = 0; ci <= cols.length; ci++) {
      if (ci === newCol) {
        children.push(
          <DropPlaceholder
            vertical={false}
            animate={animate}
            key={`phc-${zone}-${ci}`}
            size={dragSize?.width ?? DEFAULT_FLOAT_WIDTH}
          />
        );
      }
      if (ci < cols.length) {
        const panels = cols[ci].filter(isRenderable);
        if (panels.length > 0) {
          const rowPh = dt && dt.zone === zone && dt.col === ci && dt.row !== null ? dt.row : -1;
          children.push(renderColumn(zone, ci, panels, rowPh, animate));
        }
      }
    }
    if (children.length === 0) return null;
    return (
      <div data-dock-zone={zone} className="flex h-full flex-shrink-0 gap-1.5">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toolbar
        recent={recent}
        onNew={handleNew}
        onOpen={handleOpen}
        hasActive={!!active}
        loading={busy || !assets}
        onClearRecent={clearRecent}
        onOpenRecent={(path) => void openPath(path)}
        onCloseMap={() => activeId && closeTab(activeId)}
        onOpenPreferences={() => setPreferencesOpen(true)}
      />

      <Preferences
        open={preferencesOpen}
        onResetLayout={resetLayout}
        onOpenChange={setPreferencesOpen}
        onSaved={() => void loadGeneralConfig().then((g) => setMaxStack(g.maxStack))}
      />

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onDragStart={handleDragStart}
        collisionDetection={pointerWithin}
      >
        <div ref={workspaceRef} className="relative flex min-h-0 flex-1 gap-1.5 overflow-hidden bg-toolbar-bg p-1.5">
          {renderSide('left')}

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-card shadow-island">
            <MapTabs
              tabs={tabs}
              onNew={handleNew}
              onClose={closeTab}
              activeId={activeId}
              onSelect={setActiveId}
              disabled={busy || !assets}
            />

            <div ref={mapAreaRef} className="relative min-h-0 flex-1">
              {active && assets ? (
                <MapCanvas
                  key={active.id}
                  map={active.map}
                  zoom={active.zoom}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  onHover={setHover}
                  items={assets.items}
                  viewRef={mapViewRef}
                  automagic={automagic}
                  floorZ={active.floorZ}
                  onZoomChange={setZoom}
                  activeTool={activeTool}
                  sprPath={assets.sprPath}
                  centerRef={mapCenterRef}
                  activeBrush={activeBrush}
                  onFloorChange={setFloorZ}
                  onSelect={setSelectedItem}
                  onSelectBrush={selectBrush}
                  onToolChange={setActiveTool}
                  itemNames={assets.itemNames}
                  transparency={assets.transparency}
                  onEdit={(z) => minimapApiRef.current?.markDirty(z)}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  {error ?? status}
                </div>
              )}

              {progress && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                  <div className="text-sm text-muted-foreground">{progress.label}</div>
                  <div className="h-2 w-72 overflow-hidden rounded-full bg-secondary">
                    <div
                      style={{ width: `${Math.round(progress.value * 100)}%` }}
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                    />
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{Math.round(progress.value * 100)}%</div>
                </div>
              )}

              {cornered.map((id) => {
                const corner = cornerOf(layout, id);
                if (!corner) return null;
                return (
                  <CornerPanel
                    key={id}
                    guarded={guard}
                    corner={corner}
                    meta={PANELS[id]}
                    onResizeEnd={() => setResizing(false)}
                    onResizeStart={() => setResizing(true)}
                    width={layout.width[id] ?? DEFAULT_MINIMAP_SIZE}
                    height={layout.height[id] ?? DEFAULT_MINIMAP_SIZE}
                    onResize={(side, dx, dy) => resizeCornerPanel(id, corner, side, dx, dy)}
                  >
                    {(handle) => renderPanel(id, handle)}
                  </CornerPanel>
                );
              })}
            </div>
          </div>

          {renderSide('right')}

          {floating.map((id) => {
            const rect = floatRectOf(layout, id);
            if (!rect) return null;
            return (
              <FloatingPanel
                key={id}
                rect={rect}
                guarded={guard}
                meta={PANELS[id]}
                onResizeEnd={() => setResizing(false)}
                onResizeStart={() => setResizing(true)}
                onResize={(side, dx, dy) => resizeFloatPanel(id, side, dx, dy)}
              >
                {(handle) => renderPanel(id, handle)}
              </FloatingPanel>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging ? (
            <div
              style={{ width: dragSize?.width, height: dragSize?.height }}
              className="cursor-grabbing rounded-lg shadow-[0_10px_40px_-5px_rgba(0,0,0,0.65)] ring-1 ring-black/40"
            >
              {renderPanel(dragging)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <StatusBar
        hover={hover}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onZoomChange={setZoom}
        zoom={active?.zoom ?? 1}
        status={error ?? status}
        onFloorChange={setFloorZ}
        selectedItem={selectedItem}
        floorZ={active?.floorZ ?? 7}
      />
    </div>
  );
};

if (typeof window !== 'undefined') {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(<App />);
