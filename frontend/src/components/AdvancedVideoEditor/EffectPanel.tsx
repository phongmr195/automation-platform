import React, { useState } from 'react';
import { useEditorStore } from './store';
import type { Effect } from './effects/types';
import { Sparkles, Trash2, Plus, Edit2 } from 'lucide-react';

export const EffectPanel: React.FC<{ elementId: string }> = ({ elementId }) => {
  const { elements, addEffect, removeEffect, updateEffect } = useEditorStore();
  const element = elements.find((el) => el.id === elementId);
  const effects = element?.effects || [];
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [effectType, setEffectType] = useState<Effect['type']>('glow');
  
  const handleAddEffect = () => {
    let newEffect: Effect;
    
    switch (effectType) {
      case 'blur':
        newEffect = {
          id: `effect-${Date.now()}`,
          type: 'blur',
          enabled: true,
          radius: 10,
        };
        break;
      case 'shadow':
        newEffect = {
          id: `effect-${Date.now()}`,
          type: 'shadow',
          enabled: true,
          offsetX: 5,
          offsetY: 5,
          blur: 10,
          color: '#000000',
          opacity: 0.5,
        };
        break;
      case 'colorAdjust':
        newEffect = {
          id: `effect-${Date.now()}`,
          type: 'colorAdjust',
          enabled: true,
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hue: 0,
        };
        break;
      case 'glow':
        newEffect = {
          id: `effect-${Date.now()}`,
          type: 'glow',
          enabled: true,
          color: '#FFD700',
          intensity: 0.8,
          radius: 20,
        };
        break;
      default:
        return;
    }
    
    addEffect(elementId, newEffect);
    setShowAddForm(false);
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">✨ Effects</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <Plus size={16} className="text-blue-400" />
        </button>
      </div>
      
      {/* Add Effect Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <select
            value={effectType}
            onChange={(e) => setEffectType(e.target.value as Effect['type'])}
            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
          >
            <option value="glow">Glow</option>
            <option value="shadow">Shadow</option>
            <option value="blur">Blur</option>
            <option value="colorAdjust">Color Adjust</option>
          </select>
          
          <div className="flex gap-2">
            <button
              onClick={handleAddEffect}
              className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Effect List */}
      {effects.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-4">
          No effects yet. Click + to add one!
        </div>
      ) : (
        <div className="space-y-2">
          {effects.map((effect) => (
            <EffectItem
              key={effect.id}
              elementId={elementId}
              effect={effect}
              onRemove={() => removeEffect(elementId, effect.id)}
              onUpdate={(updates) => updateEffect(elementId, effect.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EffectItem: React.FC<{
  elementId: string;
  effect: Effect;
  onRemove: () => void;
  onUpdate: (updates: Partial<Effect>) => void;
}> = ({ effect, onRemove, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  
  const effectIcons: Record<Effect['type'], string> = {
    blur: '💨',
    shadow: '🌑',
    colorAdjust: '🎨',
    glow: '✨',
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span>{effectIcons[effect.type]}</span>
          <div className="flex-1">
            <div className="text-sm text-gray-200 capitalize">{effect.type}</div>
            <div className="text-xs text-gray-500">
              {effect.enabled ? 'Active' : 'Disabled'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <Edit2 size={14} className="text-gray-400" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 hover:bg-red-700 rounded transition-colors"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Expanded Controls */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
          {effect.type === 'blur' && (
            <div>
              <label className="text-xs text-gray-400">Radius (0-50)</label>
              <input
                type="range"
                value={effect.radius}
                onChange={(e) => onUpdate({ radius: parseFloat(e.target.value) })}
                min="0"
                max="50"
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-right">{effect.radius}px</div>
            </div>
          )}
          
          {effect.type === 'shadow' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Offset X</label>
                  <input
                    type="number"
                    value={effect.offsetX}
                    onChange={(e) => onUpdate({ offsetX: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Offset Y</label>
                  <input
                    type="number"
                    value={effect.offsetY}
                    onChange={(e) => onUpdate({ offsetY: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Blur</label>
                <input
                  type="range"
                  value={effect.blur}
                  onChange={(e) => onUpdate({ blur: parseFloat(e.target.value) })}
                  min="0"
                  max="50"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.blur}px</div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Color</label>
                <input
                  type="color"
                  value={effect.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-full h-8 bg-gray-700 rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Opacity (0-1)</label>
                <input
                  type="range"
                  value={effect.opacity}
                  onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.opacity}</div>
              </div>
            </>
          )}
          
          {effect.type === 'colorAdjust' && (
            <>
              <div>
                <label className="text-xs text-gray-400">Brightness (-1 to 1)</label>
                <input
                  type="range"
                  value={effect.brightness}
                  onChange={(e) => onUpdate({ brightness: parseFloat(e.target.value) })}
                  min="-1"
                  max="1"
                  step="0.1"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.brightness}</div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Contrast (-1 to 1)</label>
                <input
                  type="range"
                  value={effect.contrast}
                  onChange={(e) => onUpdate({ contrast: parseFloat(e.target.value) })}
                  min="-1"
                  max="1"
                  step="0.1"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.contrast}</div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Saturation (-1 to 1)</label>
                <input
                  type="range"
                  value={effect.saturation}
                  onChange={(e) => onUpdate({ saturation: parseFloat(e.target.value) })}
                  min="-1"
                  max="1"
                  step="0.1"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.saturation}</div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Hue Rotate (0-360°)</label>
                <input
                  type="range"
                  value={effect.hue}
                  onChange={(e) => onUpdate({ hue: parseFloat(e.target.value) })}
                  min="0"
                  max="360"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.hue}°</div>
              </div>
            </>
          )}
          
          {effect.type === 'glow' && (
            <>
              <div>
                <label className="text-xs text-gray-400">Color</label>
                <input
                  type="color"
                  value={effect.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-full h-8 bg-gray-700 rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Intensity (0-1)</label>
                <input
                  type="range"
                  value={effect.intensity}
                  onChange={(e) => onUpdate({ intensity: parseFloat(e.target.value) })}
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.intensity}</div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Radius (0-50)</label>
                <input
                  type="range"
                  value={effect.radius}
                  onChange={(e) => onUpdate({ radius: parseFloat(e.target.value) })}
                  min="0"
                  max="50"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{effect.radius}px</div>
              </div>
            </>
          )}
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={effect.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="rounded"
            />
            <label className="text-xs text-gray-400">Enabled</label>
          </div>
        </div>
      )}
    </div>
  );
};
