import { Settings, RefreshCw, FolderOpen } from 'lucide-react';

import { Button } from '~/components/commons/ui/button';

interface AssetsMissingProps {
  dataDir: string;
  clientConfigured: boolean;
  onOpenFolder: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
}

const AssetsMissing = ({ dataDir, clientConfigured, onOpenFolder, onOpenSettings, onRetry }: AssetsMissingProps) => (
  <div className="flex h-full items-center justify-center p-8">
    <div className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-border/60 bg-card p-6 shadow-island">
      <div className="text-sm font-semibold text-foreground">No client data found</div>
      {clientConfigured ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Place this version&apos;s data into the folder below, then reload. Nothing is bundled - you provide it per version.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Set the client folder for this version in Preferences &rsaquo; Client Version, then reload.
        </p>
      )}
      {dataDir && (
        <div className="w-full break-all rounded bg-secondary/40 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
          {dataDir}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onOpenSettings}>
          <Settings />
          Client settings
        </Button>
        <Button size="sm" variant="ghost" onClick={onRetry} className="ml-auto">
          <RefreshCw />
          Reload
        </Button>
        <Button size="sm" variant="secondary" disabled={!dataDir} onClick={onOpenFolder}>
          <FolderOpen />
          Open data folder
        </Button>
      </div>
    </div>
  </div>
);

export default AssetsMissing;
