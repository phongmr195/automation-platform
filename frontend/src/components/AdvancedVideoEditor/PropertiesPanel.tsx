import React, { useEffect, useRef } from 'react';
import { useEditorStore } from './store';
import type { TextElement, ShapeElement } from './types';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Trash2, Copy, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { AnimationPanel } from './AnimationPanel';
import { EffectPanel } from './EffectPanel';

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Impact', 'Roboto', 'Montserrat', 'Pacifico', 'Lobster', 'Inter'];

export const PropertiesPanel: React.FC = () => {
  const { elements, selectedIds, updateElement, deleteElement, duplicateElement } = useEditorStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedElement = selectedIds.length === 1
    ? elements.find(el => el.id === selectedIds[0])
    : null;

  // Auto-focus textarea when text element is selected
  useEffect(() => {
    if (selectedElement?.type === 'text' && textareaRef.current) {
      // Focus after a small delay to ensure panel is rendered
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select(); // Select all text for quick edit
      }, 100);
    }
  }, [selectedElement?.id, selectedElement?.type]);

  if (!selectedElement) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 text-gray-500 text-center pt-20">
        <div className="text-gray-600 mb-2">No element selected</div>
        <p className="text-sm">Click an element to edit</p>
        <div className="mt-6 text-xs text-gray-700">
          <p className="mb-2">💡 Quick Tips:</p>
          <p>• Click text to edit instantly</p>
          <p>• Drag elements to move</p>
          <p>• Drag timeline bars for timing</p>
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<typeof selectedElement>) => {
    updateElement(selectedElement.id, updates);
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Properties</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            {selectedElement.type}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => duplicateElement(selectedElement.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy size={16} />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => deleteElement(selectedElement.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
            title="Delete (Del)"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
        {/* Text-specific properties - FIRST for quick access */}
        {selectedElement.type === 'text' && (
          <>
            <Section title="✏️ Text Content">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={(selectedElement as TextElement).text}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                  placeholder="Type your text here..."
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border-2 border-gray-700 focus:border-purple-500 focus:outline-none resize-none transition-colors"
                  rows={3}
                  onKeyDown={(e) => {
                    // Allow Enter for new line
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.stopPropagation();
                    }
                  }}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-600">
                  {(selectedElement as TextElement).text.length} chars
                </div>
              </div>
            </Section>

            <Section title="🎨 Font Style">
              <Select
                label="Family"
                value={(selectedElement as TextElement).fontFamily}
                onChange={(value) => handleUpdate({ fontFamily: value })}
                options={FONTS}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Size"
                  type="number"
                  value={(selectedElement as TextElement).fontSize}
                  onChange={(value) => handleUpdate({ fontSize: Number(value) })}
                  min={12}
                  max={200}
                />

                <ColorPicker
                  label="Color"
                  value={(selectedElement as TextElement).color}
                  onChange={(value) => handleUpdate({ color: value })}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate({
                    fontWeight: (selectedElement as TextElement).fontWeight === 'bold' ? 'normal' : 'bold'
                  })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    (selectedElement as TextElement).fontWeight === 'bold'
                      ? 'bg-purple-600 text-white shadow-lg scale-105'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  <Bold size={16} />
                  Bold
                </button>

                <button
                  onClick={() => handleUpdate({
                    fontStyle: (selectedElement as TextElement).fontStyle === 'italic' ? 'normal' : 'italic'
                  })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    (selectedElement as TextElement).fontStyle === 'italic'
                      ? 'bg-purple-600 text-white shadow-lg scale-105'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  <Italic size={16} />
                  Italic
                </button>
              </div>

              <div className="flex gap-1">
                {[
                  { value: 'left', icon: AlignLeft, label: 'Left' },
                  { value: 'center', icon: AlignCenter, label: 'Center' },
                  { value: 'right', icon: AlignRight, label: 'Right' }
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => handleUpdate({ textAlign: value as any })}
                    className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm transition-all ${
                      (selectedElement as TextElement).textAlign === value
                        ? 'bg-purple-600 text-white shadow-lg scale-105'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title={label}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Common Properties */}
        <Section title="📐 Transform">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="X"
              type="number"
              value={Math.round(selectedElement.x)}
              onChange={(value) => handleUpdate({ x: Number(value) })}
            />
            <Input
              label="Y"
              type="number"
              value={Math.round(selectedElement.y)}
              onChange={(value) => handleUpdate({ y: Number(value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Width"
              type="number"
              value={Math.round(selectedElement.width)}
              onChange={(value) => handleUpdate({ width: Math.max(1, Number(value)) })}
            />
            <Input
              label="Height"
              type="number"
              value={Math.round(selectedElement.height)}
              onChange={(value) => handleUpdate({ height: Math.max(1, Number(value)) })}
            />
          </div>
          <Input
            label="Rotation"
            type="number"
            value={Math.round(selectedElement.rotation)}
            onChange={(value) => handleUpdate({ rotation: Number(value) })}
            min={-180}
            max={180}
          />
        </Section>

        <Section title="🎭 Appearance">
          <Slider
            label="Opacity"
            value={selectedElement.opacity}
            onChange={(value) => handleUpdate({ opacity: value })}
            min={0}
            max={1}
            step={0.1}
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleUpdate({ visible: !selectedElement.visible })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm ${
                selectedElement.visible
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {selectedElement.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              {selectedElement.visible ? 'Visible' : 'Hidden'}
            </button>

            <button
              onClick={() => handleUpdate({ locked: !selectedElement.locked })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm ${
                selectedElement.locked
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {selectedElement.locked ? <Lock size={16} /> : <Unlock size={16} />}
              {selectedElement.locked ? 'Locked' : 'Unlocked'}
            </button>
          </div>
        </Section>

        <Section title="⏱️ Timing">
          <Input
            label="Start Time (s)"
            type="number"
            value={selectedElement.startTime.toFixed(2)}
            onChange={(value) => handleUpdate({ startTime: Math.max(0, Number(value)) })}
            step={0.1}
          />
          <Input
            label="Duration (s)"
            type="number"
            value={selectedElement.duration.toFixed(2)}
            onChange={(value) => handleUpdate({ duration: Math.max(0.1, Number(value)) })}
            step={0.1}
          />
          <div className="text-xs text-gray-500 mt-2">
            Ends at: {(selectedElement.startTime + selectedElement.duration).toFixed(2)}s
          </div>
        </Section>


        {/* Animations & Effects */}
        <div className="border-t border-gray-800 pt-4">
          <AnimationPanel elementId={selectedElement.id} />
        </div>

        <div className="border-t border-gray-800 pt-4">
          <EffectPanel elementId={selectedElement.id} />
        </div>
        {/* Shape-specific properties */}
        {selectedElement.type === 'shape' && (
          <Section title="🎨 Shape Style">
            <ColorPicker
              label="Fill Color"
              value={(selectedElement as ShapeElement).fill}
              onChange={(value) => handleUpdate({ fill: value })}
            />
            <ColorPicker
              label="Stroke Color"
              value={(selectedElement as ShapeElement).stroke}
              onChange={(value) => handleUpdate({ stroke: value })}
            />
            <Input
              label="Stroke Width"
              type="number"
              value={(selectedElement as ShapeElement).strokeWidth}
              onChange={(value) => handleUpdate({ strokeWidth: Number(value) })}
              min={0}
              max={20}
            />
          </Section>
        )}
      </div>
    </div>
  );
};

// Helper Components
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-gray-400 text-sm font-semibold">{title}</h4>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const Input: React.FC<{
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, type = 'text', value, onChange, min, max, step }) => (
  <div>
    <label className="block text-gray-400 text-xs mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
    />
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}> = ({ label, value, onChange, min, max, step = 0.01 }) => (
  <div>
    <div className="flex justify-between mb-1">
      <label className="text-gray-400 text-xs">{label}</label>
      <span className="text-gray-400 text-xs">{(value * 100).toFixed(0)}%</span>
    </div>
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
    />
  </div>
);

const Select: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-gray-400 text-xs mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-gray-400 text-xs mb-1">{label}</label>
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 bg-gray-800 rounded-lg border border-gray-700 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm transition-colors"
        placeholder="#000000"
      />
    </div>
  </div>
);
