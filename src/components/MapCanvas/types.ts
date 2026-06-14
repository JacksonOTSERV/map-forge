import React from 'react';

import { ToolId } from '~/domain/tools';
import { ThingType } from '~/domain/tibia';
import { MapView, MapMeta, Position } from '~/domain/map';
import { ActiveBrush, PaletteCategoryId } from '~/domain/palette';

export interface Camera {
  x: number;
  y: number;
}

export interface MeshInfo {
  count: number;
  version: number;
  epoch: number;
  complete: boolean;
  lastUsed: number;
}

export interface SelTile {
  x: number;
  y: number;
  z: number;
  all: boolean;
}

export interface HoverItem {
  serverId: number;
  clientId: number;
  name: string;
  count: number;
}

export interface HoverInfo {
  x: number;
  y: number;
  z: number;
  hasTile: boolean;
  item: HoverItem | null;
}

export interface ContextMenuState {
  clientX: number;
  clientY: number;
  tile: Position;
  dest: Position | null;
  item: HoverItem | null;
  ground: HoverItem | null;
  hasSelection: boolean;
  canPaste: boolean;
}

export interface MapCanvasProps {
  map: MapMeta;
  items: Map<number, ThingType>;
  itemNames: Map<number, string>;
  sprPath: string;
  transparency: boolean;
  floorZ: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  onFloorChange: (z: number) => void;
  onHover: (info: HoverInfo | null) => void;
  onSelect: (item: HoverItem | null) => void;
  onSelectBrush: (brush: ActiveBrush | null) => void;
  onRevealBrush?: (category: PaletteCategoryId, serverId: number) => void;
  onToolChange: (tool: ToolId) => void;
  activeBrush: ActiveBrush | null;
  activeTool: ToolId;
  automagic: boolean;
  copyPositionFormat: string;
  onEdit?: (z: number) => void;
  paused?: boolean;
  initialCenter: { x: number; y: number };
  onViewChange?: (cx: number, cy: number) => void;
  viewRef?: React.MutableRefObject<MapView | null>;
  centerRef?: React.MutableRefObject<((x: number, y: number) => void) | null>;
}
