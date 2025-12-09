import type { Effect, EffectResult } from '../effects/types';
import { applyEffect, mergeEffectResults } from '../effects/registry';

// Apply all effects to an element
export const applyEffects = (effects: Effect[]): EffectResult => {
  const results: EffectResult[] = [];
  
  effects.forEach(effect => {
    const effectResult = applyEffect(effect);
    if (effectResult) {
      results.push(effectResult);
    }
  });
  
  return mergeEffectResults(results);
};

// Get computed effect properties for an element
export const getEffectProperties = <T extends { effects?: Effect[] }>(
  element: T
): EffectResult => {
  if (!element.effects || element.effects.length === 0) {
    return {};
  }
  
  return applyEffects(element.effects);
};
