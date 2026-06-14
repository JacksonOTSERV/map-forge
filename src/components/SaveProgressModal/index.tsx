interface SaveProgressModalProps {
  value: number;
  label: string;
}

const SaveProgressModal = ({ value, label }: SaveProgressModalProps) => {
  const pct = Math.round(value * 100);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex w-80 flex-col items-center gap-4 rounded-lg border border-border/60 bg-card p-6 shadow-island">
        <div className="text-sm font-semibold text-foreground">Saving map</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out" />
        </div>
        <div className="font-mono text-xs text-muted-foreground">{pct}%</div>
        <div className="text-center text-[10px] text-muted-foreground">Do not close the editor while saving.</div>
      </div>
    </div>
  );
};

export default SaveProgressModal;
