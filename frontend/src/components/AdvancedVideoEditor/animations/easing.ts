import type { EasingFunction } from './types';

// Easing functions (t: 0-1) => 0-1
export const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  
  easeIn: (t) => t * t,
  
  easeOut: (t) => t * (2 - t),
  
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
  },
};

export const applyEasing = (t: number, easing: EasingFunction): number => {
  return easingFunctions[easing](Math.max(0, Math.min(1, t)));
};
