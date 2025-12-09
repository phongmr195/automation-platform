import type { TextRevealAnimation, AnimationResult } from './types';
import { applyEasing } from './easing';

export const applyTextRevealAnimation = (
  animation: TextRevealAnimation,
  currentTime: number,
  textLength: number
): AnimationResult | null => {
  const { startTime, duration, mode, speed, easing } = animation;
  
  if (currentTime < startTime || currentTime > startTime + duration) {
    return null;
  }
  
  const elapsed = currentTime - startTime;
  const progress = elapsed / duration;
  const easedProgress = applyEasing(progress, easing);
  
  switch (mode) {
    case 'typewriter':
      return {
        textVisibleLength: Math.floor(textLength * easedProgress * speed),
      };
    
    case 'fadeIn':
      return {
        opacity: easedProgress,
      };
    
    case 'slideUp':
      return {
        y: -50 * (1 - easedProgress),
        opacity: easedProgress,
      };
    
    default:
      return null;
  }
};
