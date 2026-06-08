import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';

import { MapMeta } from '~/domain/map';
import { snapZoom } from '~/usecase/zoom';
import { newOtbm, openOtbm, closeMap } from '~/adapter/map';
import { LoadedAssets, DEFAULT_DATA_DIR } from '~/adapter/assets';
import { addRecentMap, loadRecentMaps, clearRecentMaps } from '~/adapter/recentMaps';

const NEW_MAP_WIDTH = 1024;
const NEW_MAP_HEIGHT = 1024;

let tabSeq = 0;

export interface MapTab {
  id: string;
  title: string;
  map: MapMeta;
  floorZ: number;
  zoom: number;
}

interface MapTabsActions {
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
}

export interface MapTabsApi {
  tabs: MapTab[];
  recent: string[];
  active: MapTab | null;
  activeId: string | null;
  busy: boolean;
  progress: { value: number; label: string } | null;
  setActiveId: (id: string | null) => void;
  closeTab: (id: string) => void;
  openPath: (path: string) => Promise<void>;
  handleOpen: () => Promise<void>;
  handleNew: () => Promise<void>;
  clearRecent: () => void;
  setFloorZ: (z: number) => void;
  setZoom: (z: number) => void;
}

export const useMapTabs = (assets: LoadedAssets | null, { setStatus, setError }: MapTabsActions): MapTabsApi => {
  const [tabs, setTabs] = React.useState<MapTab[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ value: number; label: string } | null>(null);

  const active = tabs.find((t) => t.id === activeId) ?? null;

  React.useEffect(() => {
    void loadRecentMaps().then(setRecent);
  }, []);

  const clearRecent = () => {
    void clearRecentMaps().then(() => setRecent([]));
  };

  const updateActive = (patch: Partial<MapTab>) =>
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, ...patch } : t)));

  const setFloorZ = (z: number) => updateActive({ floorZ: z });
  const setZoom = (z: number) => updateActive({ zoom: snapZoom(z) });

  const addTab = (title: string, data: MapMeta) => {
    const id = `tab-${++tabSeq}`;
    setTabs((prev) => [...prev, { id, title, map: data, floorZ: 7, zoom: 1 }]);
    setActiveId(id);
  };

  const closeTab = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    const tab = tabs[idx];
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (tab) void closeMap(tab.map.id).catch(() => undefined);
    if (id === activeId) setActiveId(next[idx]?.id ?? next[idx - 1]?.id ?? null);
  };

  const openPath = async (path: string) => {
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
  };

  const handleOpen = async () => {
    if (!assets) return;
    const selected = await open({
      multiple: false,
      defaultPath: DEFAULT_DATA_DIR,
      title: 'Open OTBM map',
      filters: [{ name: 'OTBM Maps', extensions: ['otbm'] }]
    });
    if (!selected || typeof selected !== 'string') return;
    await openPath(selected);
  };

  const handleNew = async () => {
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
  };

  return {
    tabs,
    recent,
    active,
    activeId,
    busy,
    progress,
    setActiveId,
    closeTab,
    openPath,
    handleOpen,
    handleNew,
    clearRecent,
    setFloorZ,
    setZoom
  };
};
