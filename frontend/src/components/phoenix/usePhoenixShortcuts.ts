import React from 'react';

// ═══════════════════════════════════════════════════════════
//  PHOENIX KEYBOARD SHORTCUTS HOOK
//  F2 new · F10 save · Ctrl+P print · Esc close
//  Handlers are kept in a ref updated in an effect so the
//  listener never needs to re-bind.
// ═══════════════════════════════════════════════════════════

export interface PhoenixShortcutHandlers {
  onNew?: () => void;      // F2
  onSave?: () => void;     // F10
  onPrint?: () => void;    // Ctrl+P
  onClose?: () => void;    // Esc
}

export const usePhoenixShortcuts = (handlers: PhoenixShortcutHandlers) => {
  const handlersRef = React.useRef(handlers);

  React.useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handlersRef.current.onNew?.(); }
      else if (e.key === 'F10') { e.preventDefault(); handlersRef.current.onSave?.(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault(); handlersRef.current.onPrint?.();
      }
      else if (e.key === 'Escape') { e.preventDefault(); handlersRef.current.onClose?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};
