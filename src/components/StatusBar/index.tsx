import { HoverInfo } from '~/components/MapCanvas/types';

interface StatusBarProps {
  status: string;
  hover: HoverInfo | null;
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

const StatusBar = ({ status, hover }: StatusBarProps) => {
  return (
    <div className="flex h-7 flex-shrink-0 items-stretch border-t border-border bg-toolbar-bg text-xs text-muted-foreground">
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
    </div>
  );
};

export default StatusBar;
