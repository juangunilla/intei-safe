import { useEffect, useState } from 'react';
import { Arrow, Group, Image as KonvaImage, Text } from 'react-konva';
import { getSymbolDefinition, SYMBOL_SIZE_DEFAULT } from '../symbols/symbolRegistry.jsx';
import { ELEMENT_TYPES } from '../types';

const CanvasElement = ({ element, isSelected, onSelect, onChange, layerLocked }) => {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (element.type !== ELEMENT_TYPES.PLAN_IMAGE || !element.src) return undefined;
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = element.src;
    return () => { nextImage.onload = null; };
  }, [element.type, element.src]);
  const commonProps = {
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    scaleX: element.scaleX,
    scaleY: element.scaleY,
    draggable: !layerLocked,
    onClick: (e) => {
      e.cancelBubble = true;
      onSelect(element.id, e.evt.shiftKey);
    },
    onTap: (e) => {
      e.cancelBubble = true;
      onSelect(element.id, false);
    },
    onDragEnd: (e) => {
      onChange(element.id, { x: e.target.x(), y: e.target.y(), userModified: true });
    },
    onTransformEnd: (e) => {
      const node = e.target;
      onChange(element.id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        userModified: true,
      });
    },
  };

  if (element.type === ELEMENT_TYPES.SYMBOL) {
    const def = getSymbolDefinition(element.symbolId);
    if (!def) return null;
    return (
      <Group {...commonProps} name={`element-${element.id}`}>
        {def.render({ width: SYMBOL_SIZE_DEFAULT, height: SYMBOL_SIZE_DEFAULT })}
      </Group>
    );
  }

  if (element.type === ELEMENT_TYPES.ARROW) {
    return (
      <Arrow
        {...commonProps}
        name={`element-${element.id}`}
        points={element.points}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        fill={element.stroke}
        pointerLength={element.pointerLength}
        pointerWidth={element.pointerWidth}
      />
    );
  }

  if (element.type === ELEMENT_TYPES.TEXT) {
    return (
      <Text
        {...commonProps}
        name={`element-${element.id}`}
        text={element.text}
        fontSize={element.fontSize}
        fill={element.fill}
        onDblClick={() => {
          const newText = window.prompt('Editar texto', element.text);
          if (newText !== null) onChange(element.id, { text: newText, userModified: true });
        }}
      />
    );
  }

  if (element.type === ELEMENT_TYPES.PLAN_IMAGE) {
    return <KonvaImage {...commonProps} name={`element-${element.id}`} image={image}
      width={element.width} height={element.height} opacity={element.opacity ?? 1} />;
  }

  return null;
};

export default CanvasElement;
