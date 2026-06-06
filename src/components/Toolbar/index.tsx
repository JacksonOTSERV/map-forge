import { Layers, ZoomIn, ZoomOut, FolderOpen } from 'lucide-react';

import { Button } from '~/components/commons/ui/button';
import { Slider } from '~/components/commons/ui/slider';
import { Separator } from '~/components/commons/ui/separator';

interface ToolbarProps {
  floorZ: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  loading: boolean;
  onOpen: () => void;
  onFloorChange: (z: number) => void;
  onZoomChange: (zoom: number) => void;
}

const Toolbar = ({ floorZ, zoom, minZoom, maxZoom, loading, onOpen, onFloorChange, onZoomChange }: ToolbarProps) => {
  return (
    <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-toolbar-bg px-3 py-2">
      <Button size="sm" onClick={onOpen} disabled={loading} variant="secondary">
        <FolderOpen className="mr-2 h-4 w-4" />
        Open Map
      </Button>

      <Separator className="h-6" orientation="vertical" />

      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="w-14 text-xs text-muted-foreground">Floor {floorZ}</span>
        <Slider min={0} max={15} step={1} className="w-40" value={[floorZ]} onValueChange={(v) => onFloorChange(v[0])} />
      </div>

      <Separator className="h-6" orientation="vertical" />

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onZoomChange(Math.max(minZoom, zoom / 2))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onZoomChange(Math.min(maxZoom, zoom * 2))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;
