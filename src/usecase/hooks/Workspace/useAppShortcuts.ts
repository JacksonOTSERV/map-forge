import React from 'react';

interface ShortcutActions {
  activeId: string | null;
  handleNew: () => void;
  handleOpen: () => void;
  handleSave: () => void;
  handleSaveAs: () => void;
  closeTab: (id: string) => void;
  openEditTowns: () => void;
  openPreferences: () => void;
  toggleMinimap: () => void;
  openMapProperties: () => void;
  openMapStatistics: () => void;
  refreshAssets: () => void;
  toggleShade: () => void;
  toggleAutomagic: () => void;
  toggleCreatures: () => void;
  toggleTooltips: () => void;
  toggleBlocking: () => void;
  toggleHouses: () => void;
  toggleWaypoints: () => void;
  toggleSpawns: () => void;
}

export const useAppShortcuts = (actions: ShortcutActions) => {
  const ref = React.useRef(actions);
  ref.current = actions;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const a = ref.current;
      if (key === 's') {
        e.preventDefault();
        if (e.shiftKey) a.handleSaveAs();
        else a.handleSave();
        return;
      }
      if (key === 'a') {
        e.preventDefault();
        a.toggleAutomagic();
        return;
      }
      if (key === 'h') {
        e.preventDefault();
        a.toggleHouses();
        return;
      }
      if (e.shiftKey) return;
      if (key === 'n') {
        e.preventDefault();
        a.handleNew();
      } else if (key === 'o') {
        e.preventDefault();
        a.handleOpen();
      } else if (key === 'w' && a.activeId) {
        e.preventDefault();
        a.closeTab(a.activeId);
      } else if (key === 't') {
        e.preventDefault();
        a.openEditTowns();
      } else if (key === 'p') {
        e.preventDefault();
        a.openMapProperties();
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
      if (e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const key = e.key.toLowerCase();
      if (e.altKey) {
        if (key === 's') {
          e.preventDefault();
          ref.current.toggleSpawns();
        }
        return;
      }
      if (e.shiftKey) {
        if (key === 'w') {
          e.preventDefault();
          ref.current.toggleWaypoints();
        }
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        ref.current.toggleMinimap();
      } else if (key === 'q') {
        e.preventDefault();
        ref.current.toggleShade();
      } else if (key === 'f') {
        e.preventDefault();
        ref.current.toggleCreatures();
      } else if (key === 'y') {
        e.preventDefault();
        ref.current.toggleTooltips();
      } else if (key === 'o') {
        e.preventDefault();
        ref.current.toggleBlocking();
      } else if (e.key === 'F8') {
        e.preventDefault();
        ref.current.openMapStatistics();
      } else if (e.key === 'F5') {
        e.preventDefault();
        ref.current.refreshAssets();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
