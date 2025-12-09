import type { Animation, AnimationResult } from './types';
import { applyFadeAnimation } from './fade';
import { applyMoveAnimation } from './move';
import { applyScaleAnimation } from './scale';
import { applyRotateAnimation } from './rotate';
import { applyBounceAnimation } from './bounce';
import { applyTextRevealAnimation } from './textReveal';

type AnimationApplier = (
  animation: any,
  currentTime: number,
  context?: any
) => AnimationResult | null;

// Registry for extensibility
const animationRegistry: Record<string, AnimationApplier> = {
  fade: applyFadeAnimation,
  move: applyMoveAnimation,
  scale: applyScaleAnimation,
  rotate: applyRotateAnimation,
  bounce: applyBounceAnimation,
  textReveal: applyTextRevealAnimation,
};

export const registerAnimation = (type: string, applier: AnimationApplier) => {
  animationRegistry[type] = applier;
};

export const applyAnimation = (
  animation: Animation,
  currentTime: number,
  context?: any
): AnimationResult | null => {
  if (!animation.enabled) return null;
  
  const applier = animationRegistry[animation.type];
  if (!applier) {
    console.warn(`Animation type "${animation.type}" not registered`);
    return null;
  }
  
  return applier(animation, currentTime, context);
};
