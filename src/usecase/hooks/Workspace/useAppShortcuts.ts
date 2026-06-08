import React from 'react';

interface ShortcutActions {
  activeId: string | null;
  handleNew: () => void;
  handleOpen: () => void;
  closeTab: (id: string) => void;
  openPreferences: () => void;
  toggleMinimap: () => void;
}

export const useAppShortcuts = (actions: ShortcutActions) => {
  const ref = React.useRef(actions);
  ref.current = actions;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      const a = ref.current;
      if (key === 'n') {
        e.preventDefault();
        a.handleNew();
      } else if (key === 'o') {
        e.preventDefault();
        a.handleOpen();
      } else if (key === 'w' && a.activeId) {
        e.preventDefault();
        a.closeTab(a.activeId);
      } else if (key === ',') {
        e.preventDefault();
        a.openPreferences();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        ref.current.toggleMinimap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
