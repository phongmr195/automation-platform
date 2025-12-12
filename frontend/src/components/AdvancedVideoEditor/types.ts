/**
 * Advanced Video Editor Types
 * Complete type definitions for Canva-style editor
 */

import type { Animation } from './animations/types';
import type { Effect } from './effects/types';

export type ElementType = 'text' | 'image' | 'shape' | 'video' | 'audio';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';
export type AnimationType = 'none' | 'fadeIn' | 'fadeOut' | 'slideIn' | 'slideOut' | 'zoom' | 'bounce';
export type TransitionType = 'none' | 'fade' | 'dissolve' | 'slide' | 'wipe';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  startTime: number;
  duration: number;
  zIndex: number;
  scaleX?: number;
  scaleY?: number;
  animation?: {
    type: AnimationType;
    duration: number;
    delay: number;
  };
  // NEW: Animation & Effects System
  animations?: Animation[];
  effects?: Effect[];
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface VideoElement extends BaseElement {
  type: 'video';
  src: string;
  volume: number;
  playbackRate: number;
  // Video-specific trim data
  trimStart?: number; // seconds from original video start
  trimEnd?: number; // seconds from original video end
  originalDuration?: number; // full duration of source video
}

// Uploaded video asset metadata
export interface VideoAsset {
  id: string;
  name: string;
  src: string; // blob URL or server URL
  duration: number;
  width: number;
  height: number;
  thumbnail?: string; // base64 or URL
  size: number; // bytes
  type: string; // mime type
  uploadedAt: Date;
}

// Video clip on timeline (derived from VideoAsset)
export interface VideoClip {
  id: string;
  assetId: string; // reference to VideoAsset
  trackIndex: number; // which track this clip is on
  startTime: number; // position on timeline
  duration: number; // visible duration on timeline
  trimStart: number; // trim from original video start
  trimEnd: number; // trim from original video end
  volume: number;
  playbackRate: number;
  transitions?: {
    in?: TransitionType;
    out?: TransitionType;
  };
}

// Video track container
export interface VideoTrack {
  id: string;
  name: string;
  clips: VideoClip[];
  locked: boolean;
  visible: boolean;
  volume: number;
}

export interface AudioElement extends BaseElement {
  type: 'audio';
  src: string;
  volume: number;
  waveformColor: string;
}

export type EditorElement = TextElement | ImageElement | ShapeElement | VideoElement | AudioElement;

export interface EditorState {
  elements: EditorElement[];
  selectedIds: string[];
  currentTime: number;
  duration: number;
  zoom: number;
  playing: boolean;
  videoSrc: string | null;
  canvasWidth: number;
  canvasHeight: number;
  // Multi-video support
  videoAssets: VideoAsset[];
  videoTracks: VideoTrack[];
  selectedClipIds: string[]; // for video clip selection
  activeVideoClip: VideoClip | null; // currently playing clip
}

export interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: 24 | 30 | 60;
  resolution: '720p' | '1080p' | '4k';
}

export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  elements: EditorElement[];
  duration: number;
  category: string;
}
