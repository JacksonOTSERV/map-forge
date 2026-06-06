import { X, Plus } from 'lucide-react';

import { cn } from '~/usecase/classNames';

export interface MapTabInfo {
  id: string;
  title: string;
}

interface MapTabsProps {
  activeId: string | null;
  disabled?: boolean;
  tabs: MapTabInfo[];
  onNew: () => void;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

const MapTabs = ({ tabs, activeId, disabled, onNew, onSelect, onClose }: MapTabsProps) => {
  return (
    <div className="flex h-7 flex-shrink-0 items-stretch overflow-x-auto border-b border-border/50 bg-secondary/80">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'group flex max-w-44 flex-shrink-0 cursor-default items-center gap-2 border-r border-border/50 pl-3 pr-1.5 text-xs',
              isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:bg-card/40'
            )}
          >
            <span className="truncate">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded hover:bg-foreground/15 hover:text-foreground',
                isActive ? 'text-muted-foreground' : 'text-transparent group-hover:text-muted-foreground'
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <button
        onClick={onNew}
        title="New map"
        disabled={disabled}
        className="flex w-8 flex-shrink-0 items-center justify-center text-muted-foreground hover:bg-card/40 hover:text-foreground disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

export default MapTabs;
