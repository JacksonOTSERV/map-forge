import { Layers, ZoomIn, ZoomOut } from 'lucide-react';

import { stepZoom } from '~/usecase/zoom';
import { Slider } from '~/components/commons/ui/slider';
import { HoverInfo } from '~/components/MapCanvas/types';

interface StatusBarProps {
  status: string;
  floorZ: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  hover: HoverInfo | null;
  onFloorChange: (z: number) => void;
  onZoomChange: (zoom: number) => void;
}

const TileDescription = ({ hover }: { hover: HoverInfo | null }) => {
  if (!hover) return null;
  if (!hover.item) return <span className="text-muted-foreground/70">{hover.hasTile ? 'Empty tile' : 'Nothing'}</span>;

  const { name, serverId, clientId, count } = hover.item;
  return (
    <span className="truncate">
      Item{name ? ` "${name}"` : ''} id:<span className="text-foreground">{serverId}</span> cid:
      <span className="text-foreground">{clientId}</span>
      {count > 1 ? <span className="text-muted-foreground/70"> ({count} items)</span> : null}
    </span>
  );
};

const StatusBar = ({ status, hover, floorZ, zoom, onFloorChange, onZoomChange }: StatusBarProps) => {
  return (
    <div className="flex h-8 flex-shrink-0 items-stretch border-t border-border/50 bg-toolbar-bg text-xs text-muted-foreground">
      <div className="flex min-w-0 flex-1 items-center px-3">
        <span className="truncate">{status}</span>
      </div>

      <div className="w-px self-stretch bg-border" />

      <div className="flex min-w-0 flex-1 items-center px-3 font-mono">
        <TileDescription hover={hover} />
      </div>

      <div className="w-px self-stretch bg-border" />

      <div className="flex w-44 flex-shrink-0 items-center px-3 font-mono tabular-nums">
        {hover ? (
          <span>
            x: <span className="text-foreground">{hover.x}</span> y:<span className="text-foreground">{hover.y}</span> z:
            <span className="text-foreground">{hover.z}</span>
          </span>
        ) : null}
      </div>

      <div className="w-px self-stretch bg-border" />

      <div className="flex flex-shrink-0 items-center gap-2 px-3">
        <Layers className="h-3.5 w-3.5" />
        <span className="w-12 tabular-nums">Floor {floorZ}</span>
        <Slider min={0} max={15} step={1} className="w-24" value={[floorZ]} onValueChange={(v) => onFloorChange(v[0])} />

        <div className="mx-1 h-4 w-px bg-border" />

        <button
          onClick={() => onZoomChange(stepZoom(zoom, -1))}
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent hover:text-foreground"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="w-10 text-center tabular-nums text-foreground">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => onZoomChange(stepZoom(zoom, 1))}
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent hover:text-foreground"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
