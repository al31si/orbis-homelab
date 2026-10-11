import { useEffect } from 'react';

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Cmd/Ctrl+K toggles the palette from anywhere; `/` opens it when no field has focus. Other
 * modal dialogs (sheets) keep their keyboard to themselves.
 */
export function usePaletteHotkeys(open: boolean, setOpen: (open: boolean) => void): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const toggle =
        (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k';
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !open;
      if (!toggle && !slash) return;
      if (slash && isTyping(event.target)) return;
      if (!open && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      setOpen(!open);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);
}
