export type DockZone = 'left' | 'right';

export type PanelId = 'palette';

export interface PanelMeta {
  id: PanelId;
  title: string;
}

export type DockLayout = Record<DockZone, PanelId[]>;

export const DOCK_ZONES: DockZone[] = ['left', 'right'];

export const PANELS: Record<PanelId, PanelMeta> = {
  palette: { id: 'palette', title: 'Palette' }
};

export const DEFAULT_DOCK_LAYOUT: DockLayout = { left: ['palette'], right: [] };
