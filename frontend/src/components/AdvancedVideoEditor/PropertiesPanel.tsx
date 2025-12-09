import React from 'react';
import { useEditorStore } from './store';
import type { TextElement, ShapeElement } from './types';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Trash2, Copy, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Impact', 'Roboto', 'Montserrat', 'Pacifico', 'Lobster'];

export const PropertiesPanel: React.FC = () => {
  const { elements, selectedIds, updateElement, deleteElement, duplicateElement } = useEditorStore();
  
  const selectedElement = selectedIds.length === 1 
    ? elements.find(el => el.id === selectedIds[0])
    : null;

  if (!selectedElement) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 text-gray-500 text-center pt-20">
        <div className="text-gray-600 mb-2">No element selected</div>
        <p className="text-sm">Select an element to edit its properties</p>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<typeof selectedElement>) => {
    updateElement(selectedElement.id, updates);
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-white font-semibold mb-3">Properties</h3>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => duplicateElement(selectedElement.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm"
            title="Duplicate"
          >
            <Copy size={16} />
            <span>Duplicate</span>
          </button>
          
          <button
            onClick={() => deleteElement(selectedElement.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            title="Delete"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Common Properties */}
        <Section title="Transform">
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
          <Input
            label="Width"
            type="number"
            value={Math.round(selectedElement.width)}
            onChange={(value) => handleUpdate({ width: Number(value) })}
          />
          <Input
            label="Height"
            type="number"
            value={Math.round(selectedElement.height)}
            onChange={(value) => handleUpdate({ height: Number(value) })}
          />
          <Input
            label="Rotation"
            type="number"
            value={Math.round(selectedElement.rotation)}
            onChange={(value) => handleUpdate({ rotation: Number(value) })}
            min={-180}
            max={180}
          />
        </Section>

        <Section title="Appearance">
          <Slider
            label="Opacity"
            value={selectedElement.opacity}
            onChange={(value) => handleUpdate({ opacity: value })}
            min={0}
            max={1}
            step={0.1}
            displayValue={`${Math.round(selectedElement.opacity * 100)}%`}
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
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {selectedElement.locked ? <Lock size={16} /> : <Unlock size={16} />}
              {selectedElement.locked ? 'Locked' : 'Unlocked'}
            </button>
          </div>
        </Section>

        <Section title="Timing">
          <Input
            label="Start (s)"
            type="number"
            value={selectedElement.startTime}
            onChange={(value) => handleUpdate({ startTime: Number(value) })}
            min={0}
            step={0.1}
          />
          <Input
            label="Duration (s)"
            type="number"
            value={selectedElement.duration}
            onChange={(value) => handleUpdate({ duration: Number(value) })}
            min={0.1}
            step={0.1}
          />
        </Section>

        {/* Text-specific properties */}
        {selectedElement.type === 'text' && (
          <>
            <Section title="Text">
              <textarea
                value={(selectedElement as TextElement).text}
                onChange={(e) => handleUpdate({ text: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                rows={3}
              />
            </Section>

            <Section title="Font">
              <Select
                label="Family"
                value={(selectedElement as TextElement).fontFamily}
                onChange={(value) => handleUpdate({ fontFamily: value })}
                options={FONTS}
              />
              
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
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate({ 
                    fontWeight: (selectedElement as TextElement).fontWeight === 'bold' ? 'normal' : 'bold' 
                  })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    (selectedElement as TextElement).fontWeight === 'bold'
                      ? 'bg-purple-600 text-white'
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
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    (selectedElement as TextElement).fontStyle === 'italic'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  <Italic size={16} />
                  Italic
                </button>
              </div>
              
              <div className="flex gap-1">
                {['left', 'center', 'right'].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleUpdate({ textAlign: align as any })}
                    className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm ${
                      (selectedElement as TextElement).textAlign === align
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    {align === 'left' && <AlignLeft size={16} />}
                    {align === 'center' && <AlignCenter size={16} />}
                    {align === 'right' && <AlignRight size={16} />}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Shape-specific properties */}
        {selectedElement.type === 'shape' && (
          <Section title="Shape">
            <ColorPicker
              label="Fill"
              value={(selectedElement as ShapeElement).fill}
              onChange={(value) => handleUpdate({ fill: value })}
            />
            <ColorPicker
              label="Stroke"
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
  <div>
    <h4 className="text-gray-400 text-sm font-medium mb-2">{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const Input: React.FC<{
  label: string;
  type: string;
  value: number | string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, type, value, onChange, min, max, step }) => (
  <div>
    <label className="text-gray-400 text-xs mb-1 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
    />
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  displayValue: string;
}> = ({ label, value, onChange, min, max, step, displayValue }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="text-gray-400 text-xs">{label}</label>
      <span className="text-white text-xs">{displayValue}</span>
    </div>
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full"
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
    <label className="text-gray-400 text-xs mb-1 block">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
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
    <label className="text-gray-400 text-xs mb-1 block">{label}</label>
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-16 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
      />
    </div>
  </div>
);
