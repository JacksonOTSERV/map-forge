import { useDroppable } from '@dnd-kit/core';

import { DockZone } from '~/domain/dock';
import { cn } from '~/usecase/classNames';

interface DropZoneProps {
  zone: DockZone;
  active: boolean;
  width?: number;
}

const DropZone = ({ zone, active, width }: DropZoneProps) => {
  const { setNodeRef } = useDroppable({ id: `zone-${zone}` });
  const left = zone === 'left';

  return (
    <div ref={setNodeRef} className={cn('flex h-full basis-[35%]', left ? 'justify-start' : 'justify-end')}>
      <div
        style={{ width }}
        className={cn(
          'h-full flex-shrink-0 rounded-lg bg-primary/20 ring-1 ring-inset ring-primary/30 transition-all duration-200 ease-out',
          active ? 'translate-x-0 opacity-100' : cn('opacity-0', left ? '-translate-x-3' : 'translate-x-3')
        )}
      />
    </div>
  );
};

export default DropZone;
