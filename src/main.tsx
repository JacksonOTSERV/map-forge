import React from 'react';
import { createRoot } from 'react-dom/client';
import { open } from '@tauri-apps/plugin-dialog';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  useSensor,
  DndContext,
  useSensors,
  DragOverlay,
  DragEndEvent,
  pointerWithin,
  DragOverEvent,
  PointerSensor,
  DragStartEvent
} from '@dnd-kit/core';

import { MapMeta } from '~/domain/map';
import { cn } from '~/usecase/classNames';
import Toolbar from '~/components/Toolbar';
import MapTabs from '~/components/MapTabs';
import StatusBar from '~/components/StatusBar';
import MapCanvas from '~/components/MapCanvas';
import { loadPalette } from '~/adapter/palette';
import DropZone from '~/components/Dock/DropZone';
import PalettePanel from '~/components/PalettePanel';
import { newOtbm, openOtbm, closeMap } from '~/adapter/map';
import DockablePanel from '~/components/Dock/DockablePanel';
import { ActiveBrush, PaletteData } from '~/domain/palette';
import { MIN_ZOOM, MAX_ZOOM, snapZoom } from '~/usecase/zoom';
import { DragHandleProps } from '~/components/Dock/DockablePanel';
import { HoverInfo, HoverItem } from '~/components/MapCanvas/types';
import { loadAssets, LoadedAssets, DEFAULT_DATA_DIR } from '~/adapter/assets';
import { PANELS, PanelId, DockZone, FloatRect, DockLayout, DEFAULT_FLOAT_WIDTH, DEFAULT_FLOAT_HEIGHT } from '~/domain/dock';
import {
  dockPanel,
  floatPanel,
  dockZoneOf,
  floatRectOf,
  panelsInZone,
  floatingPanels,
  loadDockLayout,
  saveDockLayout
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

const ResizeHandle = () => (
  <PanelResizeHandle className="group relative w-1.5 flex-shrink-0 outline-none">
    <div
      style={{ background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--primary)) 50%, transparent 100%)' }}
      className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-[resize-handle-state=hover]:opacity-100 group-data-[resize-handle-state=drag]:opacity-100"
    />
  </PanelResizeHandle>
);

const App = () => {
  const [assets, setAssets] = React.useState<LoadedAssets | null>(null);
  const [palette, setPalette] = React.useState<PaletteData | null>(null);
  const [activeBrush, setActiveBrush] = React.useState<ActiveBrush | null>(null);
  const [status, setStatus] = React.useState('Loading client assets...');
  const [error, setError] = React.useState<string | null>(null);
  const [tabs, setTabs] = React.useState<MapTab[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ value: number; label: string } | null>(null);
  const [hover, setHover] = React.useState<HoverInfo | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<HoverItem | null>(null);
  const [layout, setLayout] = React.useState<DockLayout>(() => loadDockLayout());
  const [dragging, setDragging] = React.useState<PanelId | null>(null);
  const [dragSize, setDragSize] = React.useState<{ width: number; height: number } | null>(null);
  const [hoverZone, setHoverZone] = React.useState<DockZone | null>(null);
  const [dragSettled, setDragSettled] = React.useState(false);

  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const dragOrigin = React.useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const active = tabs.find((t) => t.id === activeId) ?? null;

  function zoneFromId(id: unknown): DockZone | null {
    return id === 'zone-left' ? 'left' : id === 'zone-right' ? 'right' : null;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as PanelId;
    const el = document.querySelector(`[data-panel-id="${id}"]`);
    const rect = el?.getBoundingClientRect();
    dragOrigin.current = { left: rect?.left ?? 0, top: rect?.top ?? 0 };
    setDragSize(rect ? { width: rect.width, height: rect.height } : null);
    setDragging(id);
    setHoverZone(dockZoneOf(layout, id));
  }

  function handleDragOver(event: DragOverEvent) {
    setHoverZone(zoneFromId(event.over?.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = event.active.id as PanelId;
    const zone = zoneFromId(event.over?.id);
    setDragging(null);
    setHoverZone(null);
    setLayout((prev) => {
      const next = zone ? dockPanel(prev, id, zone) : floatPanel(prev, id, dropRect(prev, id, event.delta));
      saveDockLayout(next);
      return next;
    });
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

  React.useEffect(() => {
    setSelectedItem(null);
  }, [activeId]);

  React.useEffect(() => {
    if (!dragging) {
      setDragSettled(false);
      return;
    }
    const raf = requestAnimationFrame(() => setDragSettled(true));
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

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

  async function handleOpen() {
    if (!assets) return;
    const selected = await open({
      multiple: false,
      defaultPath: DEFAULT_DATA_DIR,
      title: 'Open OTBM map',
      filters: [{ name: 'OTBM Maps', extensions: ['otbm'] }]
    });
    if (!selected || typeof selected !== 'string') return;

    setBusy(true);
    setProgress({ value: 0, label: 'Reading map...' });
    setStatus('Reading map...');
    try {
      const data = await openOtbm(selected, (_phase, value) => {
        setProgress({ value, label: 'Reading map...' });
      });
      const name = selected.split(/[\\/]/).pop() ?? 'map.otbm';
      addTab(name, data);
      const dims = `${data.bounds.minX}..${data.bounds.maxX} x ${data.bounds.minY}..${data.bounds.maxY}`;
      setStatus(`${name} - ${data.tileCount} tiles - ${dims} - ${data.width}x${data.height}`);
    } catch (e) {
      setError(`Failed to open map: ${e}`);
      setStatus('Map load failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
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

  const isRenderable = (id: PanelId) => id !== dragging && (id === 'palette' ? !!(assets && palette) : false);
  const leftPanels = panelsInZone(layout, 'left').filter(isRenderable);
  const rightPanels = panelsInZone(layout, 'right').filter(isRenderable);
  const floating = floatingPanels(layout).filter(isRenderable);

  const slotSpace = (dragSize?.width ?? 0) + 6;
  const mapStyle = {
    marginLeft: hoverZone === 'left' ? slotSpace : undefined,
    marginRight: hoverZone === 'right' ? slotSpace : undefined
  };

  function renderPanel(id: PanelId, handle?: DragHandleProps) {
    if (id === 'palette' && assets && palette) {
      return (
        <PalettePanel
          data={palette}
          dragHandle={handle}
          items={assets.items}
          outfits={assets.outfits}
          sprPath={assets.sprPath}
          onSelectBrush={setActiveBrush}
          transparency={assets.transparency}
        />
      );
    }
    return null;
  }

  function renderZone(ids: PanelId[]) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-1.5">
        {ids.map((id) => (
          <DockablePanel key={id} meta={PANELS[id]}>
            {(handle) => renderPanel(id, handle)}
          </DockablePanel>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toolbar onNew={handleNew} onOpen={handleOpen} loading={busy || !assets} />

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        collisionDetection={pointerWithin}
      >
        <div ref={workspaceRef} className="relative flex min-h-0 flex-1 overflow-hidden bg-toolbar-bg p-1.5">
          <PanelGroup direction="horizontal" autoSaveId="nosbor-main-layout">
            {leftPanels.length > 0 && (
              <>
                <Panel order={1} minSize={12} maxSize={40} id="dock-left" defaultSize={18}>
                  {renderZone(leftPanels)}
                </Panel>
                <ResizeHandle />
              </>
            )}

            <Panel id="map" order={2} minSize={30}>
              <div
                style={mapStyle}
                className={cn(
                  'relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-card shadow-island',
                  dragging && dragSettled && 'transition-[margin] duration-200 ease-out'
                )}
              >
                <MapTabs
                  tabs={tabs}
                  onNew={handleNew}
                  onClose={closeTab}
                  activeId={activeId}
                  onSelect={setActiveId}
                  disabled={busy || !assets}
                />

                <div className="relative min-h-0 flex-1">
                  {active && assets ? (
                    <MapCanvas
                      key={active.id}
                      map={active.map}
                      zoom={active.zoom}
                      minZoom={MIN_ZOOM}
                      maxZoom={MAX_ZOOM}
                      onHover={setHover}
                      items={assets.items}
                      floorZ={active.floorZ}
                      onZoomChange={setZoom}
                      sprPath={assets.sprPath}
                      activeBrush={activeBrush}
                      onFloorChange={setFloorZ}
                      onSelect={setSelectedItem}
                      itemNames={assets.itemNames}
                      onSelectBrush={setActiveBrush}
                      transparency={assets.transparency}
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
                </div>
              </div>
            </Panel>

            {rightPanels.length > 0 && (
              <>
                <ResizeHandle />
                <Panel order={3} minSize={12} maxSize={40} id="dock-right" defaultSize={18}>
                  {renderZone(rightPanels)}
                </Panel>
              </>
            )}
          </PanelGroup>

          {floating.map((id) => {
            const rect = floatRectOf(layout, id);
            if (!rect) return null;
            return (
              <div
                key={id}
                className="absolute z-20"
                style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
              >
                <DockablePanel meta={PANELS[id]} className="h-full">
                  {(handle) => renderPanel(id, handle)}
                </DockablePanel>
              </div>
            );
          })}

          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-30 flex p-1.5">
              <DropZone zone="left" width={dragSize?.width} active={hoverZone === 'left'} />
              <div className="flex-1" />
              <DropZone zone="right" width={dragSize?.width} active={hoverZone === 'right'} />
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging ? (
            <div className="cursor-grabbing" style={{ width: dragSize?.width, height: dragSize?.height }}>
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
