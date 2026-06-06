import { MapMeta } from '~/domain/map';
import { ThingType } from '~/domain/tibia';

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

export interface MapCanvasProps {
  map: MapMeta;
  items: Map<number, ThingType>;
  sprPath: string;
  transparency: boolean;
  floorZ: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  onFloorChange: (z: number) => void;
  onHover: (info: HoverInfo | null) => void;
}
