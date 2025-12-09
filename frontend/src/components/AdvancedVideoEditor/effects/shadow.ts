import type { ShadowEffect, EffectResult } from './types';

export const applyShadowEffect = (effect: ShadowEffect): EffectResult => {
  const { offsetX, offsetY, blur, color, opacity } = effect;
  
  return {
    shadowColor: color,
    shadowBlur: blur,
    shadowOffsetX: offsetX,
    shadowOffsetY: offsetY,
    shadowOpacity: opacity,
  };
};
