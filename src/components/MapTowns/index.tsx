import React from 'react';
import { Plus, Trash2, MapPin } from 'lucide-react';

import { Town } from '~/domain/map';
import { cn } from '~/usecase/classNames';
import { getTowns, setTowns } from '~/adapter/map';
import { Input } from '~/components/commons/ui/input';
import { Button } from '~/components/commons/ui/button';
import { Dialog, DialogTitle, DialogHeader, DialogFooter, DialogContent } from '~/components/commons/ui/dialog';

interface MapTownsDialogProps {
  open: boolean;
  mapId: number | null;
  onSaved?: () => void;
  onOpenChange: (open: boolean) => void;
  onGoto: (x: number, y: number, z: number) => void;
}

const MapTownsDialog = ({ open, mapId, onSaved, onGoto, onOpenChange }: MapTownsDialogProps) => {
  const [towns, setTownList] = React.useState<Town[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open || mapId === null) return;
    void getTowns(mapId).then((list) => {
      setTownList(list);
      setSelectedId(list[0]?.id ?? null);
    });
  }, [open, mapId]);

  const selected = towns.find((t) => t.id === selectedId) ?? null;

  const patchSelected = (next: Partial<Town>) =>
    setTownList((list) => list.map((t) => (t.id === selectedId ? { ...t, ...next } : t)));

  const addTown = () => {
    const id = towns.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const town: Town = { id, name: 'Unnamed Town', x: 0, y: 0, z: 7 };
    setTownList((list) => [...list, town]);
    setSelectedId(id);
  };

  const removeTown = () => {
    if (selectedId === null) return;
    setTownList((list) => {
      const next = list.filter((t) => t.id !== selectedId);
      setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const gotoTemple = () => {
    if (!selected) return;
    onGoto(selected.x, selected.y, selected.z);
    onOpenChange(false);
  };

  const save = () => {
    if (mapId === null) return;
    void setTowns(mapId, towns).then(() => {
      onSaved?.();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Towns</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 p-4">
          <div className="flex w-48 flex-col gap-2">
            <div className="h-56 overflow-y-auto rounded-md border border-border bg-input">
              {towns.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">No towns</div>
              ) : (
                towns.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'block w-full truncate px-2.5 py-1.5 text-left text-xs',
                      t.id === selectedId ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
                    )}
                  >
                    {t.name}
                  </button>
                ))
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={addTown} className="h-7 justify-start text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Town
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {selected ? (
              <>
                <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                  Name
                  <Input value={selected.name} onChange={(e) => patchSelected({ name: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Town ID
                  <Input disabled value={selected.id} />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <label key={axis} className="flex flex-col gap-1 text-xs font-medium text-foreground">
                      Temple {axis.toUpperCase()}
                      <Input
                        type="number"
                        value={selected[axis]}
                        onChange={(e) => patchSelected({ [axis]: Number(e.target.value) })}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={gotoTemple} className="h-7 text-xs">
                    <MapPin className="mr-1.5 h-3.5 w-3.5" />
                    Go To
                  </Button>
                  <Button size="sm" variant="ghost" onClick={removeTown} className="h-7 text-xs text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Select or add a town</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapTownsDialog;
