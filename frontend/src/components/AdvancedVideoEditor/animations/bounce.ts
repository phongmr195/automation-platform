import type { BounceAnimation, AnimationResult } from './types';
import { applyEasing } from './easing';

export const applyBounceAnimation = (
  animation: BounceAnimation,
  currentTime: number
): AnimationResult | null => {
  const { startTime, duration, direction, intensity, easing } = animation;
  
  if (currentTime < startTime || currentTime > startTime + duration) {
    return null;
  }
  
  const elapsed = currentTime - startTime;
  const progress = elapsed / duration;
  const easedProgress = applyEasing(progress, easing);
  
  const scaleValue = direction === 'in'
    ? 0.5 + 0.5 * easedProgress // 0.5 -> 1
    : 1 + intensity * (1 - easedProgress); // 1 -> 1+intensity
  
  return {
    scaleX: scaleValue,
    scaleY: scaleValue,
  };
};
