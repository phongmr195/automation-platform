import type { RotateAnimation, AnimationResult } from './types';
import { applyEasing } from './easing';

export const applyRotateAnimation = (
  animation: RotateAnimation,
  currentTime: number
): AnimationResult | null => {
  const { startTime, duration, from, to, easing } = animation;
  
  if (currentTime < startTime || currentTime > startTime + duration) {
    return null;
  }
  
  const elapsed = currentTime - startTime;
  const progress = elapsed / duration;
  const easedProgress = applyEasing(progress, easing);
  
  return {
    rotation: from + (to - from) * easedProgress,
  };
};
