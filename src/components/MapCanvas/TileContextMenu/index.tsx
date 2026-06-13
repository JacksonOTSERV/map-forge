import React from 'react';
import { ChevronRight } from 'lucide-react';

import { Position } from '~/domain/map';

import { HoverItem, ContextMenuState } from '../types';

interface TileContextMenuProps {
  menu: ContextMenuState;
  onCut: () => void;
  onCopy: () => void;
  onCopyPosition: (tile: Position) => void;
  onPaste: (tile: Position) => void;
  onDelete: () => void;
  onGoToDest: (dest: Position) => void;
  onCopyText: (text: string) => void;
  onSelectRaw: (item: HoverItem) => void;
  onSelectGround: (item: HoverItem) => void;
}

interface ItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const Item = ({ label, shortcut, disabled, onClick }: ItemProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
  >
    <span>{label}</span>
    {shortcut && <span className="ml-6 text-xs text-muted-foreground">{shortcut}</span>}
  </button>
);

const Separator = () => <div className="my-1 h-px bg-border" />;

const SubMenu = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="group/sub relative">
    <button className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-accent">
      <span>{label}</span>
      <ChevronRight className="ml-6 h-3.5 w-3.5 text-muted-foreground" />
    </button>
    <div className="invisible absolute left-full top-0 -ml-1 min-w-[200px] rounded-md border border-border bg-popover py-1 shadow-island-lg group-hover/sub:visible">
      {children}
    </div>
  </div>
);

const TileContextMenu = ({
  menu,
  onCut,
  onCopy,
  onCopyPosition,
  onPaste,
  onDelete,
  onGoToDest,
  onCopyText,
  onSelectRaw,
  onSelectGround
}: TileContextMenuProps) => {
  const { item, ground, dest, tile, hasSelection, canPaste } = menu;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{ left: menu.clientX, top: menu.clientY }}
      className="fixed z-50 min-w-[220px] rounded-md border border-border bg-popover py-1 text-sm text-popover-foreground shadow-island-lg"
    >
      <Item label="Cut" onClick={onCut} shortcut="Ctrl+X" disabled={!hasSelection} />
      <Item label="Copy" onClick={onCopy} shortcut="Ctrl+C" disabled={!hasSelection} />
      <Item label="Paste" shortcut="Ctrl+V" disabled={!canPaste} onClick={() => onPaste(tile)} />
      <Item label="Delete" shortcut="Del" onClick={onDelete} disabled={!hasSelection} />

      <Separator />
      {dest && <Item onClick={() => onGoToDest(dest)} label={`Go To Destination (${dest.x}, ${dest.y}, ${dest.z})`} />}
      {item && <Item onClick={() => onSelectRaw(item)} label={`Select RAW${item.name ? ` "${item.name}"` : ''}`} />}
      {ground && <Item label="Select Groundbrush" onClick={() => onSelectGround(ground)} />}

      <SubMenu label="Copy...">
        <Item label="Copy Position" disabled={!hasSelection} onClick={() => onCopyPosition(tile)} />
        {item && (
          <>
            <Item label="Copy Item Server Id" onClick={() => onCopyText(String(item.serverId))} />
            <Item label="Copy Item Client Id" onClick={() => onCopyText(String(item.clientId))} />
            {item.name && <Item label="Copy Item Name" onClick={() => onCopyText(item.name)} />}
          </>
        )}
      </SubMenu>

      <Separator />
      <Item disabled label="Properties" />
    </div>
  );
};

export default TileContextMenu;
