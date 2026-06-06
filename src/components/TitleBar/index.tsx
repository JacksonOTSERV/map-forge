import { X, Minus, Square } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface TitleBarProps {
  title: string;
}

const TitleBar = ({ title }: TitleBarProps) => {
  const win = getCurrentWindow();
  return (
    <div
      data-tauri-drag-region
      className="flex h-9 flex-shrink-0 items-center justify-between border-b border-border bg-toolbar-bg"
    >
      <div data-tauri-drag-region className="pointer-events-none select-none px-3 text-sm font-medium text-foreground">
        {title}
      </div>
      <div className="flex h-full">
        <button
          onClick={() => win.minimize()}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => win.close()}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-[#c42b1c] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
