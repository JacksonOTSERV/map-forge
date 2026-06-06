import { PANELS, PanelId, DockZone, DockLayout, DOCK_ZONES, DEFAULT_DOCK_LAYOUT } from '~/domain/dock';

const STORAGE_KEY = 'nosbor-dock-layout';

export function zoneOf(layout: DockLayout, id: PanelId): DockZone | null {
  return DOCK_ZONES.find((zone) => layout[zone].includes(id)) ?? null;
}

export function movePanel(layout: DockLayout, id: PanelId, to: DockZone): DockLayout {
  const next: DockLayout = { left: [], right: [] };
  for (const zone of DOCK_ZONES) next[zone] = layout[zone].filter((p) => p !== id);
  next[to] = [...next[to], id];
  return next;
}

export function loadDockLayout(): DockLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DOCK_LAYOUT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const known = new Set(Object.keys(PANELS) as PanelId[]);
    const placed = new Set<PanelId>();
    const layout: DockLayout = { left: [], right: [] };
    for (const zone of DOCK_ZONES) {
      const ids = parsed[zone];
      if (!Array.isArray(ids)) continue;
      for (const id of ids) {
        if (known.has(id) && !placed.has(id)) {
          layout[zone].push(id);
          placed.add(id);
        }
      }
    }
    for (const id of known) if (!placed.has(id)) layout[zoneOf(DEFAULT_DOCK_LAYOUT, id) ?? 'left'].push(id);
    return layout;
  } catch {
    return DEFAULT_DOCK_LAYOUT;
  }
}

export function saveDockLayout(layout: DockLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    void 0;
  }
}
