import React from 'react';

import { ToolId, EraserMode } from '~/domain/tools';
import { ActiveBrush, PaletteCategoryId } from '~/domain/palette';

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
  activeHouseId: number | null;
  ctrlErase: boolean;
  eraserMode: EraserMode;
  reveal: PaletteReveal | null;
  paletteCategory: PaletteCategorySignal | null;
  setActiveTool: (tool: ToolId) => void;
  selectBrush: (brush: ActiveBrush | null) => void;
  setActiveHouse: (id: number | null) => void;
  setEraserMode: (mode: EraserMode) => void;
  revealInPalette: (category: PaletteCategoryId, serverId: number, name?: string) => void;
  setPaletteCategory: (category: PaletteCategoryId) => void;
}

export interface ToolProviderProps {
  children: React.ReactNode;
}
