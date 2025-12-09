import type { Effect, EffectResult } from './types';
import { applyBlurEffect } from './blur';
import { applyShadowEffect } from './shadow';
import { applyColorAdjustEffect } from './colorAdjust';
import { applyGlowEffect } from './glow';

type EffectApplier = (effect: any) => EffectResult;

// Registry for extensibility
const effectRegistry: Record<string, EffectApplier> = {
  blur: applyBlurEffect,
  shadow: applyShadowEffect,
  colorAdjust: applyColorAdjustEffect,
  glow: applyGlowEffect,
};

export const registerEffect = (type: string, applier: EffectApplier) => {
  effectRegistry[type] = applier;
};

export const applyEffect = (effect: Effect): EffectResult | null => {
  if (!effect.enabled) return null;
  
  const applier = effectRegistry[effect.type];
  if (!applier) {
    console.warn(`Effect type "${effect.type}" not registered`);
    return null;
  }
  
  return applier(effect);
};

// Merge multiple effect results
export const mergeEffectResults = (results: EffectResult[]): EffectResult => {
  const merged: EffectResult = {};
  const filters: string[] = [];
  
  results.forEach(result => {
    if (result.filter) {
      filters.push(result.filter);
    }
    
    // For shadow props, last one wins (or combine if needed)
    if (result.shadowColor) merged.shadowColor = result.shadowColor;
    if (result.shadowBlur !== undefined) merged.shadowBlur = result.shadowBlur;
    if (result.shadowOffsetX !== undefined) merged.shadowOffsetX = result.shadowOffsetX;
    if (result.shadowOffsetY !== undefined) merged.shadowOffsetY = result.shadowOffsetY;
    if (result.shadowOpacity !== undefined) merged.shadowOpacity = result.shadowOpacity;
  });
  
  if (filters.length > 0) {
    merged.filter = filters.join(' ');
  }
  
  return merged;
};
