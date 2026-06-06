import { PaletteBrush } from '~/domain/palette';
import { ThingType, getSpriteIndex } from '~/domain/tibia';

export interface SpriteCell {
  dx: number;
  dy: number;
  spriteId: number;
}

export interface BrushSpriteLayout {
  cols: number;
  rows: number;
  cells: SpriteCell[];
}

export function resolveBrushThing(
  brush: PaletteBrush,
  items: Map<number, ThingType>,
  outfits: Map<number, ThingType>,
  serverToClient: Map<number, number>
): ThingType | null {
  if (brush.kind === 'creature') {
    if (brush.lookType == null) return null;
    return outfits.get(brush.lookType) ?? null;
  }
  if (brush.lookServerId == null) return null;
  const clientId = serverToClient.get(brush.lookServerId);
  if (!clientId) return null;
  return items.get(clientId) ?? null;
}

export function brushSpriteLayout(thing: ThingType, isCreature: boolean): BrushSpriteLayout {
  const cols = Math.max(1, thing.width);
  const rows = Math.max(1, thing.height);
  const patternX = isCreature ? Math.min(2, Math.max(0, thing.patternX - 1)) : 0;
  const cells: SpriteCell[] = [];

  for (let h = 0; h < rows; h++) {
    for (let w = 0; w < cols; w++) {
      const index = getSpriteIndex(thing, w, h, 0, patternX, 0, 0, 0);
      const spriteId = thing.spriteIndex[index];
      if (spriteId == null || spriteId === 0) continue;
      cells.push({ dx: (cols - 1 - w) * 32, dy: (rows - 1 - h) * 32, spriteId });
    }
  }

  return { cols, rows, cells };
}
