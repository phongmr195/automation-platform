import { useEffect } from 'react';
import { toast } from '../utils/alerts';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const metaMatch = shortcut.meta === undefined || shortcut.meta === event.metaKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function showKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutList = shortcuts
    .map((s) => {
      const keys = [];
      if (s.ctrl || s.meta) keys.push('⌘/Ctrl');
      if (s.shift) keys.push('Shift');
      if (s.alt) keys.push('Alt');
      keys.push(s.key.toUpperCase());
      return `${keys.join('+')} - ${s.description}`;
    })
    .join('\n');

  toast.info(`Keyboard Shortcuts:\n${shortcutList}`);
}
