import React from 'react';
import { createRoot } from 'react-dom/client';
import { open } from '@tauri-apps/plugin-dialog';

import { MapMeta } from '~/domain/map';
import { openOtbm } from '~/adapter/map';
import Toolbar from '~/components/Toolbar';
import TitleBar from '~/components/TitleBar';
import StatusBar from '~/components/StatusBar';
import MapCanvas from '~/components/MapCanvas';
import { HoverInfo } from '~/components/MapCanvas/types';
import { loadAssets, LoadedAssets, DEFAULT_DATA_DIR } from '~/adapter/assets';

import './styles/index.css';

const MIN_ZOOM = 0.03125;
const MAX_ZOOM = 16;

const App = () => {
  const [assets, setAssets] = React.useState<LoadedAssets | null>(null);
  const [status, setStatus] = React.useState('Loading client assets...');
  const [error, setError] = React.useState<string | null>(null);
  const [map, setMap] = React.useState<MapMeta | null>(null);
  const [floorZ, setFloorZ] = React.useState(7);
  const [zoom, setZoom] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ value: number; label: string } | null>(null);
  const [hover, setHover] = React.useState<HoverInfo | null>(null);

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
      setMap(data);
      const dims = `${data.bounds.minX}..${data.bounds.maxX} x ${data.bounds.minY}..${data.bounds.maxY}`;
      setStatus(`${selected.split(/[\\/]/).pop()} - ${data.tileCount} tiles - ${dims} - ${data.width}x${data.height}`);
    } catch (e) {
      setError(`Failed to open map: ${e}`);
      setStatus('Map load failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TitleBar title="Nosbor Map Editor" />
      <Toolbar
        zoom={zoom}
        floorZ={floorZ}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onOpen={handleOpen}
        onZoomChange={setZoom}
        loading={busy || !assets}
        onFloorChange={setFloorZ}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {map && assets ? (
          <MapCanvas
            map={map}
            zoom={zoom}
            floorZ={floorZ}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onHover={setHover}
            items={assets.items}
            onZoomChange={setZoom}
            sprPath={assets.sprPath}
            onFloorChange={setFloorZ}
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

      <StatusBar hover={hover} status={error ?? status} />
    </div>
  );
};

if (typeof window !== 'undefined') {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(<App />);
