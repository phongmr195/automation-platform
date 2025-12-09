/**
 * Advanced Video Editor Store
 * Zustand store for state management with undo/redo
 */

import { create } from 'zustand';
import type { EditorState, HistoryState, ExportSettings, EditorElement } from './types';
import type { Animation } from './animations/types';
import type { Effect } from './effects/types';

interface EditorStore extends EditorState {
  // History
  history: HistoryState;
  
  // Actions
  addElement: (element: EditorElement) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  
  // Selection
  selectElement: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  
  // Playback
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  
  // Canvas
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Video
  setVideoSrc: (src: string | null) => void;
  setDuration: (duration: number) => void;
  
  // Layers
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Animations
  addAnimation: (elementId: string, animation: Animation) => void;
  removeAnimation: (elementId: string, animationId: string) => void;
  updateAnimation: (elementId: string, animationId: string, updates: Partial<Animation>) => void;
  
  // Effects
  addEffect: (elementId: string, effect: Effect) => void;
  removeEffect: (elementId: string, effectId: string) => void;
  updateEffect: (elementId: string, effectId: string, updates: Partial<Effect>) => void;
}

const initialState: EditorState = {
  elements: [],
  selectedIds: [],
  currentTime: 0,
  duration: 30,
  zoom: 1,
  playing: false,
  videoSrc: null,
  canvasWidth: 1920,
  canvasHeight: 1080,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,
  history: {
    past: [],
    present: initialState,
    future: [],
  },

  addElement: (element) => set((state) => ({
    elements: [...state.elements, element],
    selectedIds: [element.id],
  })),

  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    ),
  })),

  deleteElement: (id) => set((state) => ({
    elements: state.elements.filter((el) => el.id !== id),
    selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
  })),

  duplicateElement: (id) => set((state) => {
    const element = state.elements.find((el) => el.id === id);
    if (!element) return state;
    
    const newElement = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      x: element.x + 20,
      y: element.y + 20,
    };
    
    return {
      elements: [...state.elements, newElement],
      selectedIds: [newElement.id],
    };
  }),

  selectElement: (id, multi = false) => set((state) => ({
    selectedIds: multi
      ? state.selectedIds.includes(id)
        ? state.selectedIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedIds, id]
      : [id],
  })),

  deselectAll: () => set({ selectedIds: [] }),

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  seek: (time) => set({ currentTime: time }),

  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),
  setZoom: (zoom) => set({ zoom }),

  undo: () => set((state) => {
    if (state.history.past.length === 0) return state;
    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    
    return {
      ...previous,
      history: {
        past: newPast,
        present: previous,
        future: [state.history.present, ...state.history.future],
      },
    };
  }),

  redo: () => set((state) => {
    if (state.history.future.length === 0) return state;
    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);
    
    return {
      ...next,
      history: {
        past: [...state.history.past, state.history.present],
        present: next,
        future: newFuture,
      },
    };
  }),

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  setVideoSrc: (src) => set({ videoSrc: src }),
  setDuration: (duration) => set({ duration }),

  moveLayerUp: (id) => set((state) => {
    const index = state.elements.findIndex((el) => el.id === id);
    if (index === state.elements.length - 1) return state;
    
    const newElements = [...state.elements];
    [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
    
    return { elements: newElements };
  }),

  moveLayerDown: (id) => set((state) => {
    const index = state.elements.findIndex((el) => el.id === id);
    if (index === 0) return state;
    
    const newElements = [...state.elements];
    [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
    
    return { elements: newElements };
  }),

  bringToFront: (id) => set((state) => {
    const element = state.elements.find((el) => el.id === id);
    if (!element) return state;
    
    return {
      elements: [
        ...state.elements.filter((el) => el.id !== id),
        element,
      ],
    };
  }),

  sendToBack: (id) => set((state) => {
    const element = state.elements.find((el) => el.id === id);
    if (!element) return state;
    
    return {
      elements: [
        element,
        ...state.elements.filter((el) => el.id !== id),
      ],
    };
  }),

  // Animation actions
  addAnimation: (elementId, animation) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === elementId
        ? { ...el, animations: [...(el.animations || []), animation] }
        : el
    ),
  })),

  removeAnimation: (elementId, animationId) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === elementId
        ? { ...el, animations: (el.animations || []).filter((a) => a.id !== animationId) }
        : el
    ),
  })),

  updateAnimation: (elementId, animationId, updates) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === elementId
        ? {
            ...el,
            animations: (el.animations || []).map((a) =>
              a.id === animationId ? { ...a, ...updates } as Animation : a
            ),
          }
        : el
    ),
  })),

  // Effect actions
  addEffect: (elementId, effect) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === elementId
        ? { ...el, effects: [...(el.effects || []), effect] }
        : el
    ),
  })),

  removeEffect: (elementId, effectId) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === elementId
        ? { ...el, effects: (el.effects || []).filter((e) => e.id !== effectId) }
        : el
    ),
  })),

  updateEffect: (elementId, effectId, updates) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === elementId
        ? {
            ...el,
            effects: (el.effects || []).map((e) =>
              e.id === effectId ? { ...e, ...updates } as Effect : e
            ),
          }
        : el
    ),
  })),
}));
