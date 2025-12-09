/**
 * Video Editor Canvas with Konva
 * Live preview with draggable, resizable, rotatable text
 */

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Text, Transformer, Rect } from 'react-konva';
import Konva from 'konva';

export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontColor: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  rotation?: number;
  startTime: number;
  duration: number;
}

interface VideoEditorCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  textElements: TextElement[];
  onTextUpdate: (id: string, updates: Partial<TextElement>) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  currentTime: number;
}

interface DraggableTextProps {
  element: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<TextElement>) => void;
}

const DraggableText: React.FC<DraggableTextProps> = ({
  element,
  isSelected,
  onSelect,
  onChange,
}) => {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const fontStyle = `${element.bold ? 'bold ' : ''}${element.italic ? 'italic ' : ''}`;

  return (
    <>
      <Text
        ref={textRef}
        text={element.text}
        x={element.x}
        y={element.y}
        fontSize={element.fontSize}
        fill={element.fontColor}
        fontFamily={element.fontFamily || 'Arial'}
        fontStyle={fontStyle.trim() || 'normal'}
        rotation={element.rotation || 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = textRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            fontSize: Math.max(12, element.fontSize * scaleX),
            rotation: node.rotation(),
          });
        }}
        shadowColor={element.fontColor === '#ffffff' ? 'black' : 'transparent'}
        shadowBlur={element.fontColor === '#ffffff' ? 2 : 0}
        shadowOffset={{ x: 1, y: 1 }}
        shadowOpacity={0.5}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          resizeEnabled={true}
          keepRatio={false}
          borderStroke="#4F46E5"
          borderStrokeWidth={2}
          anchorStroke="#4F46E5"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={5}
        />
      )}
    </>
  );
};

const VideoEditorCanvas: React.FC<VideoEditorCanvasProps> = ({
  videoRef,
  textElements,
  onTextUpdate,
  selectedId,
  onSelect,
  currentTime,
}) => {
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (videoRef.current && containerRef.current) {
        const video = videoRef.current;
        const videoWidth = video.videoWidth || video.clientWidth || 1280;
        const videoHeight = video.videoHeight || video.clientHeight || 720;
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const scale = Math.min(
          containerWidth / videoWidth,
          containerHeight / videoHeight
        );
        setDimensions({
          width: videoWidth * scale,
          height: videoHeight * scale,
        });
      }
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', updateDimensions);
      updateDimensions();
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', updateDimensions);
      }
    };
  }, [videoRef]);

  const visibleElements = textElements.filter(
    (el) => currentTime >= el.startTime && currentTime <= el.startTime + el.duration
  );

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSelect(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ cursor: selectedId ? 'move' : 'default' }}
      >
        <Layer>
          <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="transparent" />
          {visibleElements.map((element) => (
            <DraggableText
              key={element.id}
              element={element}
              isSelected={element.id === selectedId}
              onSelect={() => onSelect(element.id)}
              onChange={(updates) => onTextUpdate(element.id, updates)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default VideoEditorCanvas;
