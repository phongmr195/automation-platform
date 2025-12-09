// Base animation interface
export type EasingFunction = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic';

export interface BaseAnimation {
  id: string;
  type: string;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  enabled: boolean;
}

// Specific animation types
export interface FadeAnimation extends BaseAnimation {
  type: 'fade';
  from: number; // 0-1
  to: number;   // 0-1
}

export interface MoveAnimation extends BaseAnimation {
  type: 'move';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface ScaleAnimation extends BaseAnimation {
  type: 'scale';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface RotateAnimation extends BaseAnimation {
  type: 'rotate';
  from: number; // degrees
  to: number;
}

export interface BounceAnimation extends BaseAnimation {
  type: 'bounce';
  direction: 'in' | 'out';
  intensity: number; // 0-1
}

export interface TextRevealAnimation extends BaseAnimation {
  type: 'textReveal';
  mode: 'typewriter' | 'fadeIn' | 'slideUp';
  speed: number;
}

// Union type for all animations
export type Animation =
  | FadeAnimation
  | MoveAnimation
  | ScaleAnimation
  | RotateAnimation
  | BounceAnimation
  | TextRevealAnimation;

// Animation result applied to element
export interface AnimationResult {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
  textVisibleLength?: number; // for text reveal
}
