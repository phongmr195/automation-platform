import type { FadeAnimation, AnimationResult } from './types';
import { applyEasing } from './easing';

export const applyFadeAnimation = (
  animation: FadeAnimation,
  currentTime: number,
  baseOpacity: number = 1
): AnimationResult | null => {
  const { startTime, duration, from, to, easing } = animation;
  
  if (currentTime < startTime || currentTime > startTime + duration) {
    return null;
  }
  
  const elapsed = currentTime - startTime;
  const progress = elapsed / duration;
  const easedProgress = applyEasing(progress, easing);
  
  const opacity = from + (to - from) * easedProgress;
  
  return { opacity: opacity * baseOpacity };
};
