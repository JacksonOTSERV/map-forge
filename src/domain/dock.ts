export type DockZone = 'left' | 'right';

export type PanelId = 'palette';

export interface PanelMeta {
  id: PanelId;
  title: string;
}

export interface FloatRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PanelPlacement = { kind: 'dock'; zone: DockZone } | { kind: 'float'; rect: FloatRect };

export type DockLayout = Record<PanelId, PanelPlacement>;

export const DOCK_ZONES: DockZone[] = ['left', 'right'];

export const PANELS: Record<PanelId, PanelMeta> = {
  palette: { id: 'palette', title: 'Palette' }
};

export const DEFAULT_DOCK_LAYOUT: DockLayout = { palette: { kind: 'dock', zone: 'right' } };

export const DEFAULT_FLOAT_WIDTH = 280;
export const DEFAULT_FLOAT_HEIGHT = 420;
