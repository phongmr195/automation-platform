import type { GlowEffect, EffectResult } from './types';

export const applyGlowEffect = (effect: GlowEffect): EffectResult => {
  const { color, intensity, radius } = effect;
  
  // Glow = shadow with no offset
  return {
    shadowColor: color,
    shadowBlur: radius * intensity,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: intensity,
  };
};
