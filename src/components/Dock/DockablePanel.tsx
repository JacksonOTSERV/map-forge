import React from 'react';
import { useDraggable } from '@dnd-kit/core';

import { cn } from '~/usecase/classNames';
import { PanelMeta } from '~/domain/dock';

type UseDraggableReturn = ReturnType<typeof useDraggable>;

export interface DragHandleProps {
  ref: UseDraggableReturn['setActivatorNodeRef'];
  className: string;
  attributes: UseDraggableReturn['attributes'];
  listeners: UseDraggableReturn['listeners'];
}

interface DockablePanelProps {
  meta: PanelMeta;
  className?: string;
  children: (handle: DragHandleProps) => React.ReactNode;
}

const HANDLE_CLASS = 'cursor-grab active:cursor-grabbing';

const DockablePanel = ({ meta, className = 'min-h-0 flex-1', children }: DockablePanelProps) => {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({ id: meta.id });

  const handle: DragHandleProps = {
    ref: setActivatorNodeRef,
    className: HANDLE_CLASS,
    attributes,
    listeners
  };

  return (
    <div ref={setNodeRef} data-panel-id={meta.id} className={cn(className, isDragging && 'opacity-40')}>
      {children(handle)}
    </div>
  );
};

export default DockablePanel;
