import type { ColorAdjustEffect, EffectResult } from './types';

export const applyColorAdjustEffect = (effect: ColorAdjustEffect): EffectResult => {
  const { brightness, contrast, saturation, hue } = effect;
  
  // Convert to CSS filter percentages
  const brightnessPercent = 100 + brightness * 100;
  const contrastPercent = 100 + contrast * 100;
  const saturatePercent = 100 + saturation * 100;
  
  return {
    filter: `brightness(${brightnessPercent}%) contrast(${contrastPercent}%) saturate(${saturatePercent}%) hue-rotate(${hue}deg)`,
  };
};
