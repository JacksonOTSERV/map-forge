import React from 'react';

import { getMapProperties } from '~/adapter/map';
import { loadSpawns } from '~/adapter/creatures';
import { MapSpawns, CreatureLook } from '~/domain/creature';

interface SpawnSource {
  id: string;
  path?: string;
  mapId: number;
}

const dirOf = (path: string) => path.replace(/[^\\/]+$/, '');
const baseName = (path: string) => path.split(/[\\/]/).pop() ?? '';

export interface MapSpawnsApi {
  spawns: MapSpawns | null;
  setSpawns: React.Dispatch<React.SetStateAction<MapSpawns | null>>;
}

export const useMapSpawns = (active: SpawnSource | null, creatureDb: Map<string, CreatureLook> | null): MapSpawnsApi => {
  const [spawns, setSpawns] = React.useState<MapSpawns | null>(null);

  React.useEffect(() => {
    if (!active?.path || !creatureDb) {
      setSpawns(null);
      return;
    }
    const path = active.path;
    let cancelled = false;
    void (async () => {
      const props = await getMapProperties(active.mapId).catch(() => null);
      const fallback = baseName(path).replace(/\.otbm$/i, '-spawn.xml');
      const file = props?.spawnFile || fallback;
      const result = await loadSpawns(dirOf(path) + file, creatureDb);
      if (!cancelled) setSpawns(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.path, active?.mapId, creatureDb]);

  return { spawns, setSpawns };
};
