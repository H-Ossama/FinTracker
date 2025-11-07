import { useRef, useEffect, useState } from 'react';
import { View, findNodeHandle, UIManager } from 'react-native';

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useTutorialElement = (elementName: string) => {
  const elementRef = useRef<View>(null);
  const [position, setPosition] = useState<ElementPosition | null>(null);

  const measureElement = () => {
    if (elementRef.current) {
      const handle = findNodeHandle(elementRef.current);
      if (handle) {
        UIManager.measureInWindow(handle, (x, y, width, height) => {
          setPosition({ x, y, width, height });
        });
      }
    }
  };

  useEffect(() => {
    // Measure after a short delay to ensure layout is complete
    const timer = setTimeout(measureElement, 500);
    return () => clearTimeout(timer);
  }, []);

  return { elementRef, position, remeasure: measureElement };
};

export const useTutorialElements = (currentElementName: string | undefined) => {
  const elements: Record<string, React.RefObject<View>> = {};
  const [positions, setPositions] = useState<Record<string, ElementPosition>>({});

  const registerElement = (name: string) => {
    const ref = useRef<View>(null);
    elements[name] = ref;
    return ref;
  };

  const measureElements = () => {
    const newPositions: Record<string, ElementPosition> = {};

    Object.entries(elements).forEach(([name, ref]) => {
      if (ref.current) {
        const handle = findNodeHandle(ref.current);
        if (handle) {
          UIManager.measureInWindow(handle, (x, y, width, height) => {
            newPositions[name] = { x, y, width, height };
            setPositions(prev => ({ ...prev, ...newPositions }));
          });
        }
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(measureElements, 500);
    return () => clearTimeout(timer);
  }, [currentElementName]);

  return { registerElement, positions, currentPosition: currentElementName ? positions[currentElementName] : null };
};
