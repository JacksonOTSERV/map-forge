import { ZoneToolId } from '~/domain/zones';

export type ToolId = 'select' | 'brush' | 'eraser' | 'spawn' | ZoneToolId;

export interface ToolMeta {
  id: ToolId;
  label: string;
}

export const TOOLS: ToolMeta[] = [
  { id: 'select', label: 'Select' },
  { id: 'brush', label: 'Brush' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'spawn', label: 'Spawn' },
  { id: 'zone_pz', label: 'Protection zone (Ctrl-drag to erase)' },
  { id: 'zone_nopvp', label: 'No-PVP zone (Ctrl-drag to erase)' },
  { id: 'zone_nologout', label: 'No-logout zone (Ctrl-drag to erase)' },
  { id: 'zone_pvp', label: 'PVP zone (Ctrl-drag to erase)' }
];

export const isZoneTool = (id: ToolId): id is ZoneToolId => id.startsWith('zone_');
