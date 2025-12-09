import type { MoveAnimation, AnimationResult } from './types';
import { applyEasing } from './easing';

export const applyMoveAnimation = (
  animation: MoveAnimation,
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
    x: fromX + (toX - fromX) * easedProgress,
    y: fromY + (toY - fromY) * easedProgress,
  };
};
