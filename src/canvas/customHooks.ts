import { useCallback } from 'react';
import {fabric } from 'fabric';

const useFabric = (canvas: React.MutableRefObject<fabric.Canvas | null>, stack: React.MutableRefObject<String[]>) => {
    const fabricRef = useCallback((element: HTMLCanvasElement | null) => {
        if (!element) {
            canvas.current?.dispose();
            canvas.current = null;
            stack.current = [];
            return;
        }
        canvas.current = new fabric.Canvas(element, {backgroundColor: 'Gainsboro', preserveObjectStacking: true});
        if (localStorage.getItem('canvas')) {
            canvas.current?.loadFromJSON(JSON.parse(localStorage.getItem('canvas') as string), () => {
                canvas.current?.renderAll();
                console.log('loaded canvas from local storage');
            });
        }
        if (localStorage.getItem('stack')) {
            stack.current = JSON.parse(localStorage.getItem('stack') as string);
        }
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = 'white';
        fabric.Object.prototype.cornerStrokeColor = 'black';
        fabric.Object.prototype.borderColor = 'black';
    }, []);
    return fabricRef;
}
export { useFabric };
