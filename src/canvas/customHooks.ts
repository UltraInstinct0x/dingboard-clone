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
        // @ts-ignore
        if (localStorage.getItem('canvas') && localStorage.getItem('canvas')['objects'] && JSON.parse(localStorage.getItem('canvas') as string)['objects'].length > 0) {
            canvas.current?.loadFromJSON(JSON.parse(localStorage.getItem('canvas') as string), () => {
                canvas.current?.renderAll();
                console.log('loaded canvas from local storage');
            });
        } else {
            const image = new Image();
            image.onload = () => {
                const imgInstance = new fabric.Image(image, {
                    left: 0,
                    top: 0,
                });
                canvas.current?.add(imgInstance);
            }

            image.src = "images/demo14.png";
        }

        if (localStorage.getItem('stack')) {
            stack.current = JSON.parse(localStorage.getItem('stack') as string);
        }
        canvas.current.setZoom(1);
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = 'white';
        fabric.Object.prototype.cornerStrokeColor = 'black';
        fabric.Object.prototype.borderColor = 'black';
    }, []);
    return fabricRef;
}
export { useFabric };
