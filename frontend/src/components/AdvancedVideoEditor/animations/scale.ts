import type { ScaleAnimation, AnimationResult } from './types';
import { applyEasing } from './easing';

export const applyScaleAnimation = (
  animation: ScaleAnimation,
  currentTime: number
): AnimationResult | null => {
  const { startTime, duration, fromX, fromY, toX, toY, easing } = animation;
  
  if (currentTime < startTime || currentTime > startTime + duration) {
    return null;
  }
  
  const elapsed = currentTime - startTime;
  const progress = elapsed / duration;
  const easedProgress = applyEasing(progress, easing);
  
  return {
    scaleX: fromX + (toX - fromX) * easedProgress,
    scaleY: fromY + (toY - fromY) * easedProgress,
  };
};
