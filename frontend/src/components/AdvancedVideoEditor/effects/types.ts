// Base effect interface
export interface BaseEffect {
  id: string;
  type: string;
  enabled: boolean;
}

// Specific effect types
export interface BlurEffect extends BaseEffect {
  type: 'blur';
  radius: number; // 0-50
}

export interface ShadowEffect extends BaseEffect {
  type: 'shadow';
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number; // 0-1
}

export interface ColorAdjustEffect extends BaseEffect {
  type: 'colorAdjust';
  brightness: number; // -1 to 1
  contrast: number;   // -1 to 1
  saturation: number; // -1 to 1
  hue: number;        // 0-360
}

export interface GlowEffect extends BaseEffect {
  type: 'glow';
  color: string;
  intensity: number; // 0-1
  radius: number;    // 0-50
}

// Union type for all effects
export type Effect =
  | BlurEffect
  | ShadowEffect
  | ColorAdjustEffect
  | GlowEffect;

// Effect result (CSS/Canvas filters/styles)
export interface EffectResult {
  filter?: string;        // CSS filter string
  shadowColor?: string;   // Konva shadow props
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
}
