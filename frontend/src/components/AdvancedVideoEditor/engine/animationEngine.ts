import type { Animation, AnimationResult } from '../animations/types';
import { applyAnimation } from '../animations/registry';

// Apply all animations to an element at a given time
export const applyAnimations = (
  animations: Animation[],
  currentTime: number,
  context?: any
): AnimationResult => {
  const result: AnimationResult = {};
  
  animations.forEach(animation => {
    const animResult = applyAnimation(animation, currentTime, context);
    if (animResult) {
      // Merge results (later animations override earlier ones)
      Object.assign(result, animResult);
    }
  });
  
  return result;
};

// Get computed properties for an element with animations applied
export const getAnimatedProperties = <T extends { 
  x: number; 
  y: number; 
  scaleX?: number;
  scaleY?: number;
  rotation: number; 
  opacity?: number;
  animations?: Animation[];
}>(
  element: T,
  currentTime: number,
  context?: any
): T & AnimationResult => {
  if (!element.animations || element.animations.length === 0) {
    return element;
  }
  
  const animResult = applyAnimations(element.animations, currentTime, context);
  
  return {
    ...element,
    x: animResult.x ?? element.x,
    y: animResult.y ?? element.y,
    scaleX: animResult.scaleX ?? element.scaleX ?? 1,
    scaleY: animResult.scaleY ?? element.scaleY ?? 1,
    rotation: animResult.rotation ?? element.rotation,
    opacity: animResult.opacity ?? element.opacity ?? 1,
    textVisibleLength: animResult.textVisibleLength,
  };
};
