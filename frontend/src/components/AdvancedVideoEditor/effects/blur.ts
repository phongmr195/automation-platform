import type { BlurEffect, EffectResult } from './types';

export const applyBlurEffect = (effect: BlurEffect): EffectResult => {
  const { radius } = effect;
  
  return {
    filter: `blur(${radius}px)`,
  };
};
