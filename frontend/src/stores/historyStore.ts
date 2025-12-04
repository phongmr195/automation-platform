import { create } from 'zustand';

interface HistoryState {
  past: string[];
  present: string;
  future: string[];
}

interface HistoryStore extends HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  recordState: (state: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  present: '',
  future: [],
  canUndo: false,
  canRedo: false,

  recordState: (state: string) => {
    const { present, past } = get();
    
    // Don't record if state hasn't changed
    if (state === present) return;

    set({
      past: [...past, present],
      present: state,
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  undo: () => {
    const { past, present, future } = get();
    
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      past: newPast,
      present: previous,
      future: [present, ...future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });

    return previous;
  },

  redo: () => {
    const { past, present, future } = get();
    
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, present],
      present: next,
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });

    return next;
  },

  clear: () => set({
    past: [],
    present: '',
    future: [],
    canUndo: false,
    canRedo: false,
  }),
}));
