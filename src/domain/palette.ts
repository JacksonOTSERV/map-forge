export type PaletteCategoryId = 'terrain' | 'doodad' | 'item' | 'creature';

export interface PaletteCategoryMeta {
  id: PaletteCategoryId;
  label: string;
}

export const PALETTE_CATEGORIES: PaletteCategoryMeta[] = [
  { id: 'terrain', label: 'Terrain Palette' },
  { id: 'doodad', label: 'Doodad Palette' },
  { id: 'item', label: 'Item Palette' },
  { id: 'creature', label: 'Creature Palette' }
];

export type BrushKind = 'ground' | 'wall' | 'doodad' | 'rawItem' | 'creature';

export interface CreatureLook {
  type: number;
  head?: number;
  body?: number;
  legs?: number;
  feet?: number;
}

export interface PaletteBrush {
  key: string;
  name: string;
  kind: BrushKind;
  lookServerId?: number;
  lookType?: number;
  creature?: CreatureLook;
}

export interface PaletteTileset {
  name: string;
  brushes: PaletteBrush[];
}

export interface ActiveBrush {
  key: string;
  name: string;
  kind: BrushKind;
  serverId?: number;
  isGround: boolean;
  preview?: string;
  cols?: number;
  rows?: number;
}

export type PaletteData = Record<PaletteCategoryId, PaletteTileset[]>;
