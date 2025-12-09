import React, { useState } from 'react';
import { useEditorStore } from './store';
import type { Animation, EasingFunction } from './animations/types';
import { Play, Trash2, Plus, Edit2 } from 'lucide-react';

export const AnimationPanel: React.FC<{ elementId: string }> = ({ elementId }) => {
  const { elements, addAnimation, removeAnimation, updateAnimation } = useEditorStore();
  const element = elements.find((el) => el.id === elementId);
  const animations = element?.animations || [];
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [animType, setAnimType] = useState<Animation['type']>('fade');
  
  const handleAddAnimation = () => {
    const baseProps = {
      id: `anim-${Date.now()}`,
      startTime: element?.startTime || 0,
      duration: 1,
      easing: 'easeOut' as EasingFunction,
      enabled: true,
    };
    
    let newAnimation: Animation;
    
    switch (animType) {
      case 'fade':
        newAnimation = { ...baseProps, type: 'fade', from: 0, to: 1 };
        break;
      case 'move':
        newAnimation = { ...baseProps, type: 'move', fromX: element!.x, fromY: element!.y, toX: element!.x, toY: element!.y - 50 };
        break;
      case 'scale':
        newAnimation = { ...baseProps, type: 'scale', fromX: 0.5, fromY: 0.5, toX: 1, toY: 1 };
        break;
      case 'rotate':
        newAnimation = { ...baseProps, type: 'rotate', from: 0, to: 360 };
        break;
      case 'bounce':
        newAnimation = { ...baseProps, type: 'bounce', direction: 'in', intensity: 0.5 };
        break;
      case 'textReveal':
        newAnimation = { ...baseProps, type: 'textReveal', mode: 'typewriter', speed: 1 };
        break;
      default:
        return;
    }
    
    addAnimation(elementId, newAnimation);
    setShowAddForm(false);
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">🎬 Animations</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <Plus size={16} className="text-purple-400" />
        </button>
      </div>
      
      {/* Add Animation Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <select
            value={animType}
            onChange={(e) => setAnimType(e.target.value as Animation['type'])}
            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
          >
            <option value="fade">Fade</option>
            <option value="move">Move</option>
            <option value="scale">Scale</option>
            <option value="rotate">Rotate</option>
            <option value="bounce">Bounce</option>
            {element?.type === 'text' && <option value="textReveal">Text Reveal</option>}
          </select>
          
          <div className="flex gap-2">
            <button
              onClick={handleAddAnimation}
              className="flex-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
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
      
      {/* Animation List */}
      {animations.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-4">
          No animations yet. Click + to add one!
        </div>
      ) : (
        <div className="space-y-2">
          {animations.map((anim) => (
            <AnimationItem
              key={anim.id}
              elementId={elementId}
              animation={anim}
              onRemove={() => removeAnimation(elementId, anim.id)}
              onUpdate={(updates) => updateAnimation(elementId, anim.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AnimationItem: React.FC<{
  elementId: string;
  animation: Animation;
  onRemove: () => void;
  onUpdate: (updates: Partial<Animation>) => void;
}> = ({ animation, onRemove, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  
  const animationIcons: Record<Animation['type'], string> = {
    fade: '👁️',
    move: '➡️',
    scale: '🔍',
    rotate: '🔄',
    bounce: '⚡',
    textReveal: '✍️',
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span>{animationIcons[animation.type]}</span>
          <div className="flex-1">
            <div className="text-sm text-gray-200 capitalize">{animation.type}</div>
            <div className="text-xs text-gray-500">
              {animation.startTime.toFixed(1)}s - {(animation.startTime + animation.duration).toFixed(1)}s
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
          <div>
            <label className="text-xs text-gray-400">Start Time (s)</label>
            <input
              type="number"
              value={animation.startTime}
              onChange={(e) => onUpdate({ startTime: parseFloat(e.target.value) })}
              step="0.1"
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-400">Duration (s)</label>
            <input
              type="number"
              value={animation.duration}
              onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) })}
              step="0.1"
              min="0.1"
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-400">Easing</label>
            <select
              value={animation.easing}
              onChange={(e) => onUpdate({ easing: e.target.value as EasingFunction })}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
            >
              <option value="linear">Linear</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="easeInOut">Ease In Out</option>
              <option value="bounce">Bounce</option>
              <option value="elastic">Elastic</option>
            </select>
          </div>
          
          {/* Type-specific controls */}
          {animation.type === 'fade' && (
            <>
              <div>
                <label className="text-xs text-gray-400">From Opacity</label>
                <input
                  type="number"
                  value={animation.from}
                  onChange={(e) => onUpdate({ from: parseFloat(e.target.value) })}
                  step="0.1"
                  min="0"
                  max="1"
                  className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">To Opacity</label>
                <input
                  type="number"
                  value={animation.to}
                  onChange={(e) => onUpdate({ to: parseFloat(e.target.value) })}
                  step="0.1"
                  min="0"
                  max="1"
                  className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
              </div>
            </>
          )}
          
          {animation.type === 'rotate' && (
            <>
              <div>
                <label className="text-xs text-gray-400">From (degrees)</label>
                <input
                  type="number"
                  value={animation.from}
                  onChange={(e) => onUpdate({ from: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">To (degrees)</label>
                <input
                  type="number"
                  value={animation.to}
                  onChange={(e) => onUpdate({ to: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
              </div>
            </>
          )}
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={animation.enabled}
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
