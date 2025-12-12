/**
 * Advanced Video Editor Store
 * Zustand store for state management with undo/redo
 */

import { create } from 'zustand';
import type { EditorState, HistoryState, ExportSettings, EditorElement, VideoAsset, VideoClip, VideoTrack } from './types';
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
  
  // Multi-Video Management
  addVideoAsset: (asset: VideoAsset) => void;
  removeVideoAsset: (assetId: string) => void;
  addVideoTrack: () => string; // returns track id
  removeVideoTrack: (trackId: string) => void;
  addClipToTrack: (clip: VideoClip) => void;
  updateClip: (clipId: string, updates: Partial<VideoClip>) => void;
  deleteClip: (clipId: string) => void;
  selectClip: (clipId: string, multi?: boolean) => void;
  deselectAllClips: () => void;
  reorderClips: (trackId: string, fromIndex: number, toIndex: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  setActiveVideoClip: (clip: VideoClip | null) => void;
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
  videoAssets: [],
  videoTracks: [],
  selectedClipIds: [],
  activeVideoClip: null,
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

  // Multi-Video Management Implementations
  addVideoAsset: (asset) => set((state) => ({
    videoAssets: [...state.videoAssets, asset],
  })),

  removeVideoAsset: (assetId) => set((state) => ({
    videoAssets: state.videoAssets.filter((a) => a.id !== assetId),
    // Also remove all clips using this asset
    videoTracks: state.videoTracks.map((track) => ({
      ...track,
      clips: track.clips.filter((clip) => clip.assetId !== assetId),
    })),
  })),

  addVideoTrack: () => {
    const trackId = `track-${Date.now()}`;
    set((state) => ({
      videoTracks: [
        ...state.videoTracks,
        {
          id: trackId,
          name: `Track ${state.videoTracks.length + 1}`,
          clips: [],
          locked: false,
          visible: true,
          volume: 1,
        },
      ],
    }));
    return trackId;
  },

  removeVideoTrack: (trackId) => set((state) => ({
    videoTracks: state.videoTracks.filter((t) => t.id !== trackId),
  })),

  addClipToTrack: (clip) => set((state) => {
    const updatedTracks = state.videoTracks.map((track, idx) => {
      if (idx !== clip.trackIndex) return track;
      const newClips = [...track.clips, clip];
      let currentTime = 0;
      const sequentialClips = newClips
        .sort((a, b) => a.startTime - b.startTime)
        .map((c) => {
          const updated = { ...c, startTime: currentTime };
          currentTime += c.duration;
          return updated;
        });
      return { ...track, clips: sequentialClips };
    });
    // Calculate total video duration
    const allClips = updatedTracks.flatMap(t => t.clips);
    const totalDuration = allClips.reduce((sum, c) => sum + c.duration, 0);
    return {
      videoTracks: updatedTracks,
      duration: Math.max(30, totalDuration),
    };
  }),

  updateClip: (clipId, updates) => set((state) => ({
    videoTracks: state.videoTracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
    })),
  })),

  deleteClip: (clipId) => set((state) => {
    const updatedTracks = state.videoTracks.map((track) => ({
      ...track,
      clips: track.clips.filter((clip) => clip.id !== clipId),
    }));
    const allClips = updatedTracks.flatMap(t => t.clips);
    const totalDuration = allClips.reduce((sum, c) => sum + c.duration, 0);
    return {
      videoTracks: updatedTracks,
      selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
      duration: Math.max(30, totalDuration),
    };
  }),

  selectClip: (clipId, multi = false) => set((state) => ({
    selectedClipIds: multi
      ? state.selectedClipIds.includes(clipId)
        ? state.selectedClipIds.filter((id) => id !== clipId)
        : [...state.selectedClipIds, clipId]
      : [clipId],
  })),

  deselectAllClips: () => set({ selectedClipIds: [] }),

  reorderClips: (trackId, fromIndex, toIndex) => set((state) => {
    const track = state.videoTracks.find((t) => t.id === trackId);
    if (!track) return state;

    const clips = [...track.clips];
    const [movedClip] = clips.splice(fromIndex, 1);
    clips.splice(toIndex, 0, movedClip);
    // Recalculate startTimes to be sequential
    let currentTime = 0;
    const sequentialClips = clips.map((c) => {
      const updated = { ...c, startTime: currentTime };
      currentTime += c.duration;
      return updated;
    });
    const updatedTracks = state.videoTracks.map((t) =>
      t.id === trackId ? { ...t, clips: sequentialClips } : t
    );
    const allClips = updatedTracks.flatMap(t => t.clips);
    const totalDuration = allClips.reduce((sum, c) => sum + c.duration, 0);
    return {
      videoTracks: updatedTracks,
      duration: Math.max(30, totalDuration),
    };
  }),

  splitClip: (clipId, splitTime) => set((state) => {
    let newTracks = [...state.videoTracks];

    for (let i = 0; i < newTracks.length; i++) {
      const track = newTracks[i];
      const clipIndex = track.clips.findIndex((c) => c.id === clipId);

      if (clipIndex !== -1) {
        const clip = track.clips[clipIndex];
        const relativeTime = splitTime - clip.startTime;

        if (relativeTime <= 0 || relativeTime >= clip.duration) {
          return state; // Invalid split time
        }

        // Create two new clips
        const clip1: VideoClip = {
          ...clip,
          id: `${clip.id}-1`,
          duration: relativeTime,
          trimEnd: clip.trimStart + relativeTime,
        };

        const clip2: VideoClip = {
          ...clip,
          id: `${clip.id}-2`,
          startTime: clip.startTime + relativeTime,
          duration: clip.duration - relativeTime,
          trimStart: clip.trimStart + relativeTime,
        };

        // Replace the original clip with two new clips
        const newClips = [
          ...track.clips.slice(0, clipIndex),
          clip1,
          clip2,
          ...track.clips.slice(clipIndex + 1),
        ];

        newTracks[i] = { ...track, clips: newClips };
        break;
      }
    }

    return { videoTracks: newTracks };
  }),

  setActiveVideoClip: (clip) => set({ activeVideoClip: clip }),
}));
