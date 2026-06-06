export const GROUND_LAYER = 7;
export const MAP_MAX_LAYER = 15;
export const MAP_MIN_LAYER = 0;

export interface FloorRange {
  startZ: number;
  endZ: number;
}

export function visibleFloorRange(current: number): FloorRange {
  const floor = Math.min(MAP_MAX_LAYER, Math.max(MAP_MIN_LAYER, current));
  const startZ = floor <= GROUND_LAYER ? GROUND_LAYER : Math.min(MAP_MAX_LAYER, floor + 2);
  return { startZ, endZ: floor };
}
