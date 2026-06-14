import React from 'react';

import { PaletteData } from '~/domain/palette';
import { loadPalette } from '~/adapter/palette';
import { setMinimapPalette } from '~/adapter/minimap';
import { loadAssets, LoadedAssets } from '~/adapter/assets';

export interface AssetsState {
  assets: LoadedAssets | null;
  palette: PaletteData | null;
  status: string;
  error: string | null;
  minimapColors: number[] | null;
  minimapReady: boolean;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useAssets = (): AssetsState => {
  const [assets, setAssets] = React.useState<LoadedAssets | null>(null);
  const [palette, setPalette] = React.useState<PaletteData | null>(null);
  const [status, setStatus] = React.useState('Loading client assets...');
  const [error, setError] = React.useState<string | null>(null);
  const [minimapReady, setMinimapReady] = React.useState(false);

  const minimapColors = React.useMemo(() => {
    if (!assets) return null;
    let max = 0;
    for (const id of assets.items.keys()) if (id > max) max = id;
    const arr = new Array<number>(max + 1).fill(0);
    for (const [id, thing] of assets.items) if (thing.miniMap && thing.miniMapColor) arr[id] = thing.miniMapColor & 0xff;
    return arr;
  }, [assets]);

  React.useEffect(() => {
    if (!minimapColors) return;
    let cancelled = false;
    setMinimapReady(false);
    void setMinimapPalette(minimapColors).then(() => {
      if (!cancelled) setMinimapReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [minimapColors]);

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

  return { assets, palette, status, error, minimapColors, minimapReady, setStatus, setError };
};
