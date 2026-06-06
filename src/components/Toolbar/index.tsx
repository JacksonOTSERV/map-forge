import { getCurrentWindow } from '@tauri-apps/api/window';
import { X, Minus, Square, FilePlus, FolderOpen } from 'lucide-react';

import { Button } from '~/components/commons/ui/button';

interface ToolbarProps {
  loading: boolean;
  onNew: () => void;
  onOpen: () => void;
}

const Toolbar = ({ loading, onNew, onOpen }: ToolbarProps) => {
  const win = getCurrentWindow();
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 flex-shrink-0 items-center gap-1 border-b border-border/50 bg-toolbar-bg pl-1.5 pr-3"
    >
      <div className="flex items-center gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={onNew}
          disabled={loading}
          onMouseDown={stop}
          className="h-6 px-2 text-xs font-medium"
        >
          <FilePlus className="mr-1.5 h-3.5 w-3.5" />
          New Map
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpen}
          disabled={loading}
          onMouseDown={stop}
          className="h-6 px-2 text-xs font-medium"
        >
          <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
          Open Map
        </Button>
      </div>

      <div className="-mr-3 ml-auto flex items-center">
        <button
          onMouseDown={stop}
          onClick={() => win.minimize()}
          className="flex h-8 w-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onMouseDown={stop}
          onClick={() => win.toggleMaximize()}
          className="flex h-8 w-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onMouseDown={stop}
          onClick={() => win.close()}
          className="flex h-8 w-9 items-center justify-center text-muted-foreground hover:bg-[#c42b1c] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
