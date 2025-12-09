// Example: Text element with animations and effects
import { Animation } from '../animations/types';
import { Effect } from '../effects/types';

// Text element with 2 animations + 1 effect
export const animatedTextExample = {
  id: 'text-example-1',
  type: 'text' as const,
  text: 'Animated Text!',
  
  // Base properties
  x: 100,
  y: 200,
  width: 400,
  height: 80,
  rotation: 0,
  opacity: 1,
  layer: 1,
  
  // Timeline
  startTime: 0,
  endTime: 5,
  duration: 5,
  
  // Text-specific
  fontSize: 48,
  fontFamily: 'Inter',
  fill: '#FFFFFF',
  
  // Animations (applied at specific times)
  animations: [
    // Animation 1: Fade in from 0s to 1s
    {
      id: 'fade-in',
      type: 'fade',
      startTime: 0,
      duration: 1,
      easing: 'easeOut',
      enabled: true,
      from: 0,   // invisible
      to: 1,     // fully visible
    },
    
    // Animation 2: Move up from 1s to 2s
    {
      id: 'move-up',
      type: 'move',
      startTime: 1,
      duration: 1,
      easing: 'easeInOut',
      enabled: true,
      fromX: 100,
      fromY: 200,
      toX: 100,
      toY: 150,  // Move up 50px
    },
  ] as Animation[],
  
  // Effects (always active when element is visible)
  effects: [
    // Effect 1: Golden glow
    {
      id: 'glow-gold',
      type: 'glow',
      enabled: true,
      color: '#FFD700',
      intensity: 0.8,
      radius: 20,
    },
  ] as Effect[],
};

// Complex example: Multiple animations + effects
export const complexAnimatedTextExample = {
  id: 'text-complex-1',
  type: 'text' as const,
  text: 'Complex Animation',
  
  x: 200,
  y: 300,
  width: 600,
  height: 100,
  rotation: 0,
  opacity: 1,
  layer: 2,
  
  startTime: 0,
  endTime: 8,
  duration: 8,
  
  fontSize: 64,
  fontFamily: 'Inter',
  fill: '#FFFFFF',
  
  animations: [
    // 1. Fade in (0-1s)
    {
      id: 'anim-1',
      type: 'fade',
      startTime: 0,
      duration: 1,
      easing: 'easeOut',
      enabled: true,
      from: 0,
      to: 1,
    },
    
    // 2. Bounce in (0-1s, overlaps with fade)
    {
      id: 'anim-2',
      type: 'bounce',
      startTime: 0,
      duration: 1,
      easing: 'bounce',
      enabled: true,
      direction: 'in',
      intensity: 0.5,
    },
    
    // 3. Move across screen (2-5s)
    {
      id: 'anim-3',
      type: 'move',
      startTime: 2,
      duration: 3,
      easing: 'easeInOut',
      enabled: true,
      fromX: 200,
      fromY: 300,
      toX: 800,
      toY: 300,
    },
    
    // 4. Rotate (3-5s, during move)
    {
      id: 'anim-4',
      type: 'rotate',
      startTime: 3,
      duration: 2,
      easing: 'easeInOut',
      enabled: true,
      from: 0,
      to: 360,
    },
    
    // 5. Fade out (6-7s)
    {
      id: 'anim-5',
      type: 'fade',
      startTime: 6,
      duration: 1,
      easing: 'easeIn',
      enabled: true,
      from: 1,
      to: 0,
    },
  ] as Animation[],
  
  effects: [
    // Multiple effects active simultaneously
    {
      id: 'effect-1',
      type: 'shadow',
      enabled: true,
      offsetX: 5,
      offsetY: 5,
      blur: 10,
      color: '#000000',
      opacity: 0.5,
    },
    {
      id: 'effect-2',
      type: 'glow',
      enabled: true,
      color: '#00FFFF',
      intensity: 0.6,
      radius: 15,
    },
  ] as Effect[],
};
