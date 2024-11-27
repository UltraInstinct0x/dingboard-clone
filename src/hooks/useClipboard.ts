import { useCallback } from 'react';
import { useCanvas } from './useCanvas';

export function useClipboard() {
  const { canvasRef, addElement } = useCanvas();

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    e.preventDefault();
    
    if (e.clipboardData?.files?.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            addElement({
              type: 'image',
              x: window.innerWidth / 2 - img.width / 2,
              y: window.innerHeight / 2 - img.height / 2,
              width: img.width,
              height: img.height,
              data: img,
            });
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    } else {
      const text = e.clipboardData?.getData('text');
      if (text) {
        addElement({
          type: 'text',
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          text,
          fontSize: 16,
          fontFamily: 'Arial',
          color: '#ffffff',
        });
      }
    }
  }, [addElement]);

  return { handlePaste };
}