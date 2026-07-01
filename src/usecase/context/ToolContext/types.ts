import React from 'react';

import { BrushOption } from '~/adapter/biomes';
import { ToolId, EraserMode } from '~/domain/tools';
import { ResolvedBiome, GenerateOptions } from '~/domain/biome';
import { ActiveBrush, PaletteCategoryId } from '~/domain/palette';
import { MountainOptions, ResolvedMountain } from '~/domain/mountain';

export interface GenerateSignal {
  biomes: ResolvedBiome[];
  opts: GenerateOptions;
  mountain: ResolvedMountain | null;
  mountainOpts: MountainOptions | null;
  nonce: number;
}

export interface HuntArea {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  z: number;
}

export interface HuntPreviewParams {
  area: HuntArea;
  viewW: number;
  viewH: number;
  boxSize: number;
  spawntime: number;
}

export interface HuntPreviewSignal extends HuntPreviewParams {
  nonce: number;
}

export interface HuntRescatterSignal {
  boxSize: number;
  viewW: number;
  viewH: number;
  nonce: number;
}

export interface HuntMeta {
  points: number;
  steps: number;
}

export interface HuntViewPreview {
  show: boolean;
  w: number;
  h: number;
}

export interface HuntMonster {
  name: string;
  lookType: number;
  head: number;
  body: number;
  legs: number;
  feet: number;
  spawntime: number;
}

export interface PaletteReveal {
  category: PaletteCategoryId;
  serverId: number;
  name?: string;
  nonce: number;
}

export interface PaletteCategorySignal {
  category: PaletteCategoryId;
  nonce: number;
}

export interface ToolContextValue {
  activeTool: ToolId;
  activeBrush: ActiveBrush | null;
  activeTile: BrushOption | null;
  secondaryTile: BrushOption | null;
  penWidth: number;
  activeHouseId: number | null;
  ctrlErase: boolean;
  eraserMode: EraserMode;
  reveal: PaletteReveal | null;
  paletteCategory: PaletteCategorySignal | null;
  generateSignal: GenerateSignal | null;
  generationProgress: string | null;
  setGenerationProgress: (label: string | null) => void;
  requestGenerate: (
    biomes: ResolvedBiome[],
    opts: GenerateOptions,
    mountain?: ResolvedMountain | null,
    mountainOpts?: MountainOptions | null
  ) => void;
  huntSignal: HuntPreviewSignal | null;
  huntMeta: HuntMeta | null;
  huntArea: HuntArea | null;
  huntAreaSelecting: boolean;
  huntEditing: boolean;
  huntView: HuntViewPreview;
  huntMonsters: HuntMonster[];
  huntRescatterSignal: HuntRescatterSignal | null;
  huntGenerateNonce: number;
  huntClearNonce: number;
  requestHuntPreview: (params: HuntPreviewParams) => void;
  requestHuntRescatter: (params: Omit<HuntRescatterSignal, 'nonce'>) => void;
  requestHuntGenerate: () => void;
  requestHuntClear: () => void;
  setHuntMeta: (meta: HuntMeta | null) => void;
  setHuntArea: (area: HuntArea | null) => void;
  setHuntAreaSelecting: (active: boolean) => void;
  setHuntEditing: (active: boolean) => void;
  setHuntView: (view: HuntViewPreview) => void;
  setHuntMonsters: (monsters: HuntMonster[]) => void;
  setActiveTool: (tool: ToolId) => void;
  selectBrush: (brush: ActiveBrush | null) => void;
  setActiveTile: (tile: BrushOption | null) => void;
  setSecondaryTile: (tile: BrushOption | null) => void;
  swapTiles: () => void;
  setPenWidth: (width: number) => void;
  setActiveHouse: (id: number | null) => void;
  setEraserMode: (mode: EraserMode) => void;
  revealInPalette: (category: PaletteCategoryId, serverId: number, name?: string) => void;
  setPaletteCategory: (category: PaletteCategoryId) => void;
  registerPalette: (id: string, category: PaletteCategoryId) => void;
  unregisterPalette: (id: string) => void;
  shouldHandleReveal: (id: string) => boolean;
}

export interface ToolProviderProps {
  children: React.ReactNode;
}
