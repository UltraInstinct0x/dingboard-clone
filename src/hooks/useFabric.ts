import { useEffect, MutableRefObject } from 'react';
import { Canvas } from 'fabric/fabric-impl';
import 'fabric';
declare const fabric: any;

export function useFabric(
  canvasRef: MutableRefObject<Canvas | null>,
  stack: MutableRefObject<string[]>
) {
  const fabricRef = useEffect(() => {
    // Initialize fabric canvas
    const canvas = new fabric.Canvas('canvas', {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#181825',
      preserveObjectStacking: true,
      stopContextMenu: true,
    });
    
    // Store canvas reference
    canvasRef.current = canvas;

    // Load saved state if exists
    const savedState = localStorage.getItem('canvas');
    if (savedState) {
      canvas.loadFromJSON(savedState, () => {
        canvas.renderAll();
      });

      const savedStack = localStorage.getItem('stack');
      if (savedStack) {
        stack.current = JSON.parse(savedStack);
      }
    }

    // Handle window resize
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  return fabricRef;
}
