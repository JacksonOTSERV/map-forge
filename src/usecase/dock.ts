import { PANELS, PanelId, DockZone, FloatRect, DockLayout, DOCK_ZONES, PanelPlacement, DEFAULT_DOCK_LAYOUT } from '~/domain/dock';

const STORAGE_KEY = 'nosbor-dock-layout';

const PANEL_IDS = Object.keys(PANELS) as PanelId[];

export function dockZoneOf(layout: DockLayout, id: PanelId): DockZone | null {
  const placement = layout[id];
  return placement.kind === 'dock' ? placement.zone : null;
}

export function panelsInZone(layout: DockLayout, zone: DockZone): PanelId[] {
  return PANEL_IDS.filter((id) => {
    const placement = layout[id];
    return placement.kind === 'dock' && placement.zone === zone;
  });
}

export function floatingPanels(layout: DockLayout): PanelId[] {
  return PANEL_IDS.filter((id) => layout[id].kind === 'float');
}

export function floatRectOf(layout: DockLayout, id: PanelId): FloatRect | null {
  const placement = layout[id];
  return placement.kind === 'float' ? placement.rect : null;
}

export function dockPanel(layout: DockLayout, id: PanelId, zone: DockZone): DockLayout {
  return { ...layout, [id]: { kind: 'dock', zone } };
}

export function floatPanel(layout: DockLayout, id: PanelId, rect: FloatRect): DockLayout {
  return { ...layout, [id]: { kind: 'float', rect } };
}

function isValidPlacement(value: unknown): value is PanelPlacement {
  if (!value || typeof value !== 'object') return false;
  const placement = value as Record<string, unknown>;
  if (placement.kind === 'dock') return DOCK_ZONES.includes(placement.zone as DockZone);
  if (placement.kind === 'float') {
    const rect = placement.rect as Record<string, unknown> | undefined;
    return !!rect && (['x', 'y', 'width', 'height'] as const).every((k) => typeof rect[k] === 'number');
  }
  return false;
}

export function loadDockLayout(): DockLayout {
  const layout: DockLayout = { ...DEFAULT_DOCK_LAYOUT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return layout;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const id of PANEL_IDS) {
      if (isValidPlacement(parsed[id])) layout[id] = parsed[id] as PanelPlacement;
    }
    return layout;
  } catch {
    return layout;
  }
}

export function saveDockLayout(layout: DockLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    void 0;
  }
}
