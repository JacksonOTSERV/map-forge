export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface MapMeta {
  width: number;
  height: number;
  tileCount: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  teleports: Map<string, Position>;
  floors: number[];
}

export interface ChunkTiles {
  tileX: Uint16Array;
  tileY: Uint16Array;
  itemOffset: Uint32Array;
  clientIds: Uint16Array;
  serverIds: Uint16Array;
}

export type OtbmProgress = (phase: 'parse' | 'decode', value: number) => void;
