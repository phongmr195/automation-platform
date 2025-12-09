import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Text, Rect, Circle, Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { useEditorStore } from './store';
import type { EditorElement, TextElement, ShapeElement, ImageElement } from './types';
import { getAnimatedProperties } from './engine/animationEngine';
import { getEffectProperties } from './engine/effectEngine';

const ImageRenderer: React.FC<{
  element: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<ImageElement>) => void;
  currentTime: number;
}> = ({ element, isSelected, onSelect, onChange, currentTime }) => {
  const [image] = useImage(element.src);
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!element.visible) return null;

  // Apply animations and effects
  const animated = getAnimatedProperties(element, currentTime);
  const effects = getEffectProperties(element);

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={image}
        x={animated.x}
        y={animated.y}
        width={element.width}
        height={element.height}
        scaleX={animated.scaleX}
        scaleY={animated.scaleY}
        rotation={animated.rotation}
        opacity={animated.opacity}
        shadowColor={effects.shadowColor}
        shadowBlur={effects.shadowBlur}
        shadowOffsetX={effects.shadowOffsetX}
        shadowOffsetY={effects.shadowOffsetY}
        shadowOpacity={effects.shadowOpacity}
        draggable={!element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = imageRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, element.width * scaleX),
            height: Math.max(5, element.height * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          resizeEnabled={true}
          borderStroke="#8B5CF6"
          borderStrokeWidth={2}
          anchorStroke="#8B5CF6"
          anchorFill="#ffffff"
          anchorSize={8}
          anchorCornerRadius={4}
        />
      )}
    </>
  );
};

const TextRenderer: React.FC<{
  element: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<TextElement>) => void;
  currentTime: number;
}> = ({ element, isSelected, onSelect, onChange, currentTime }) => {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!element.visible) return null;

  // Apply animations and effects
  const animated = getAnimatedProperties(element, currentTime, {
    textLength: element.text.length,
  });
  const effects = getEffectProperties(element);

  // Handle text reveal animation
  const displayText = animated.textVisibleLength !== undefined
    ? element.text.substring(0, animated.textVisibleLength)
    : element.text;

  // Merge effects with element shadow
  const shadowColor = effects.shadowColor || element.shadow?.color;
  const shadowBlur = effects.shadowBlur ?? element.shadow?.blur;
  const shadowOffsetX = effects.shadowOffsetX ?? element.shadow?.offsetX;
  const shadowOffsetY = effects.shadowOffsetY ?? element.shadow?.offsetY;

  return (
    <>
      <Text
        ref={textRef}
        text={displayText}
        x={animated.x}
        y={animated.y}
        width={element.width}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fontStyle={`${element.fontWeight} ${element.fontStyle}`}
        fill={element.color}
        align={element.textAlign}
        lineHeight={element.lineHeight}
        letterSpacing={element.letterSpacing}
        scaleX={animated.scaleX}
        scaleY={animated.scaleY}
        rotation={animated.rotation}
        opacity={animated.opacity}
        shadowColor={shadowColor}
        shadowBlur={shadowBlur}
        shadowOffsetX={shadowOffsetX}
        shadowOffsetY={shadowOffsetY}
        shadowOpacity={effects.shadowOpacity}
        draggable={!element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = textRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            fontSize: Math.max(12, element.fontSize * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          resizeEnabled={true}
          borderStroke="#8B5CF6"
          borderStrokeWidth={2}
          anchorStroke="#8B5CF6"
          anchorFill="#ffffff"
          anchorSize={8}
          anchorCornerRadius={4}
        />
      )}
    </>
  );
};

const ShapeRenderer: React.FC<{
  element: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<ShapeElement>) => void;
  currentTime: number;
}> = ({ element, isSelected, onSelect, onChange, currentTime }) => {
  const shapeRef = useRef<Konva.Rect | Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!element.visible) return null;

  // Apply animations and effects
  const animated = getAnimatedProperties(element, currentTime);
  const effects = getEffectProperties(element);

  const commonProps = {
    x: animated.x,
    y: animated.y,
    scaleX: animated.scaleX,
    scaleY: animated.scaleY,
    fill: element.fill,
    stroke: element.stroke,
    strokeWidth: element.strokeWidth,
    rotation: animated.rotation,
    opacity: animated.opacity,
    shadowColor: effects.shadowColor,
    shadowBlur: effects.shadowBlur,
    shadowOffsetX: effects.shadowOffsetX,
    shadowOffsetY: effects.shadowOffsetY,
    shadowOpacity: effects.shadowOpacity,
    draggable: !element.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: any) => {
      onChange({ x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: () => {
      const node = shapeRef.current;
      if (!node) return;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(5, element.width * scaleX),
        height: Math.max(5, element.height * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  return (
    <>
      {element.shapeType === 'rectangle' && (
        <Rect
          ref={shapeRef as any}
          {...commonProps}
          width={element.width}
          height={element.height}
        />
      )}
      {element.shapeType === 'circle' && (
        <Circle
          ref={shapeRef as any}
          {...commonProps}
          radius={element.width / 2}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          resizeEnabled={true}
          borderStroke="#8B5CF6"
          borderStrokeWidth={2}
          anchorStroke="#8B5CF6"
          anchorFill="#ffffff"
          anchorSize={8}
          anchorCornerRadius={4}
        />
      )}
    </>
  );
};

export const CanvasEditor: React.FC<{ videoRef?: React.RefObject<HTMLVideoElement> }> = ({ videoRef }) => {
  const {
    elements,
    selectedIds,
    selectElement,
    deselectAll,
    updateElement,
    canvasWidth,
    canvasHeight,
    zoom,
    currentTime,
    videoSrc,
  } = useEditorStore();

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleElements = elements.filter(
    (el) => currentTime >= el.startTime && currentTime <= el.startTime + el.duration
  );

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      deselectAll();
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-gray-950 flex items-center justify-center overflow-hidden relative"
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          position: 'relative',
        }}
        className="shadow-2xl"
      >
        {/* Video Background */}
        {videoSrc && videoRef && (
          <div
            style={{
              position: 'absolute',
              width: canvasWidth,
              height: canvasHeight,
              top: 0,
              left: 0,
              zIndex: 0,
            }}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000',
              }}
              muted
              playsInline
            />
          </div>
        )}

        {/* Konva Canvas Overlay */}
        <Stage
          ref={stageRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Layer>
            {/* Transparent background for click detection */}
            {!videoSrc && (
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill="#000000"
              />
            )}

            {/* Render elements by zIndex with animations/effects */}
            {visibleElements
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((element) => {
                const isSelected = selectedIds.includes(element.id);

                if (element.type === 'text') {
                  return (
                    <TextRenderer
                      key={element.id}
                      element={element}
                      isSelected={isSelected}
                      onSelect={() => selectElement(element.id)}
                      onChange={(updates) => updateElement(element.id, updates)}
                      currentTime={currentTime}
                    />
                  );
                }

                if (element.type === 'image') {
                  return (
                    <ImageRenderer
                      key={element.id}
                      element={element}
                      isSelected={isSelected}
                      onSelect={() => selectElement(element.id)}
                      onChange={(updates) => updateElement(element.id, updates)}
                      currentTime={currentTime}
                    />
                  );
                }

                if (element.type === 'shape') {
                  return (
                    <ShapeRenderer
                      key={element.id}
                      element={element}
                      isSelected={isSelected}
                      onSelect={() => selectElement(element.id)}
                      onChange={(updates) => updateElement(element.id, updates)}
                      currentTime={currentTime}
                    />
                  );
                }

                return null;
              })}
          </Layer>
        </Stage>
      </div>

      {/* Canvas Info Overlay */}
      <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-90 px-3 py-2 rounded-lg text-xs text-gray-400">
        {canvasWidth} × {canvasHeight} | {Math.round(zoom * 100)}% | {visibleElements.length} visible
        {videoSrc && ' | 🎥 Video loaded'}
      </div>
    </div>
  );
};
