import React, { useRef, useState } from 'react';
import { Type, Image, Square, Circle, Music, FileVideo, Layout, Upload, X } from 'lucide-react';
import { useEditorStore } from './store';
import type { TextElement, ImageElement, ShapeElement } from './types';
import { toast } from '../../utils/alerts';
import { VideoUploadPanel } from './VideoUploadPanel';

export const ToolsPanel: React.FC = () => {
  const addElement = useEditorStore((state) => state.addElement);
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  const addText = () => {
    const textElement: TextElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: 'Double click to edit',
      x: canvasWidth / 2 - 100,
      y: canvasHeight / 2 - 25,
      width: 200,
      height: 50,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      startTime: 0,
      duration: 5,
      zIndex: 1,
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0,
    };
    addElement(textElement);
    toast.success('Text added');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageElement: ImageElement = {
          id: `image-${Date.now()}`,
          type: 'image',
          src: event.target?.result as string,
          x: canvasWidth / 2 - 100,
          y: canvasHeight / 2 - 100,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          startTime: 0,
          duration: 5,
          zIndex: 0,
        };
        addElement(imageElement);
        toast.success('Image added');
      };
      reader.readAsDataURL(file);
    }
  };

  const addShape = (shapeType: 'rectangle' | 'circle') => {
    const shapeElement: ShapeElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      shapeType,
      x: canvasWidth / 2 - 50,
      y: canvasHeight / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      startTime: 0,
      duration: 5,
      zIndex: 0,
      fill: '#3B82F6',
      stroke: '#ffffff',
      strokeWidth: 2,
    };
    addElement(shapeElement);
    toast.success(`${shapeType} added`);
  };

  const tools = [
    { icon: Type, label: 'Text', action: addText, color: 'purple' },
    { icon: Image, label: 'Image', action: () => imageInputRef.current?.click(), color: 'blue' },
    { icon: Square, label: 'Rectangle', action: () => addShape('rectangle'), color: 'green' },
    { icon: Circle, label: 'Circle', action: () => addShape('circle'), color: 'yellow' },
    { icon: Music, label: 'Audio', action: () => toast.info('Audio coming soon'), color: 'orange' },
    { icon: FileVideo, label: 'Videos', action: () => setShowVideoUpload(!showVideoUpload), color: 'red' },
    { icon: Layout, label: 'Templates', action: () => toast.info('Templates coming soon'), color: 'indigo' },
  ];

  return (
    <div className="flex">
      {/* Main Tool Icons */}
      <div className="w-20 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = tool.label === 'Videos' && showVideoUpload;
          return (
            <button
              key={tool.label}
              onClick={tool.action}
              className={`
                w-14 h-14 flex flex-col items-center justify-center rounded-lg 
                transition-colors group
                ${isActive ? 'bg-purple-600' : 'hover:bg-gray-800'}
              `}
              title={tool.label}
            >
              <Icon 
                size={24} 
                className={`transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              <span className={`
                text-[10px] mt-1 transition-colors
                ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}
              `}>
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Video Upload Panel (Slide-out) */}
      {showVideoUpload && (
        <div className="w-80 bg-gray-950 border-r border-gray-800 overflow-y-auto">
          <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-3 flex items-center justify-between z-10">
            <h2 className="text-white font-medium flex items-center gap-2">
              <FileVideo size={18} />
              Video Library
            </h2>
            <button
              onClick={() => setShowVideoUpload(false)}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <VideoUploadPanel />
        </div>
      )}
    </div>
  );
};
