import * as tf from '@tensorflow/tfjs';
import { CustomCanvas, ImageObject } from './interfaces';
import { fabric } from 'fabric';

function handleMouseDown(this: CustomCanvas, opt: fabric.IEvent) {
  const evt = opt.e as MouseEvent;
  if (evt.metaKey === true) {
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  }
}
function handleMouseMove(this: CustomCanvas, opt: fabric.IEvent) {
    if (this.isDragging) {
        const e = opt.e as MouseEvent;
        const vpt = this.viewportTransform;
        if (vpt) {
            vpt[4] += e.clientX - this.lastPosX;
            vpt[5] += e.clientY - this.lastPosY;
        }
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
    }
}
function handleMouseUp(this: CustomCanvas) {
    this.isDragging = false;
    this.selection = true;
  // on mouse up we want to recalculate new interaction
    // for all objects, so we call setViewportTransform
    const viewportTransform = this.viewportTransform as number[];
    this.setViewportTransform(viewportTransform);
    this.isDragging = false;
    this.selection = true;
}
function handleMouseWheel(this: CustomCanvas, opt: fabric.IEvent) {
  const e = opt.e as WheelEvent;
  const delta = e.deltaY;
  let zoom = this.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  this.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
  e.preventDefault();
  e.stopPropagation();
}
function findBoundingBox(tensor: tf.Tensor3D) {
    const [height, width, _] = tensor.shape;
    return tf.tidy(() => {  
        const mask = tensor.slice([0,0,3]);
        const opaqueMask = mask.greater(tf.scalar(0));
        const rowMaskArray = opaqueMask.any(1).arraySync() as number[][];
        const colMaskArray = opaqueMask.any(0).arraySync() as number[][];

        const boundingBox = {minX: 0, minY: 0, maxX: 0, maxY: 0};
        for (let i=0;i<height;i++) {
            if (rowMaskArray[i][0]) {
                boundingBox.minY = i;
                break;
            }
        }
        for (let i=height-1;i>=0;i--) {
            if (rowMaskArray[i][0]) {
                boundingBox.maxY = i;
                break;
            }
        }
        for (let i=0;i<width;i++) {
            if (colMaskArray[i][0]) {
                boundingBox.minX = i;
                break;
            }
        }
        for (let i=width-1;i>=0;i--) {
            if (colMaskArray[i][0]) {
                boundingBox.maxX = i;
                break;
            }
        }
        return boundingBox;
    });

}
function findObjectInImages(target: fabric.Object, images: React.MutableRefObject<ImageObject[] | null>): ImageObject|null {
    let currentImage = null;
    if (target.type === 'activeSelection') {
        const newImage = new fabric.Image(target.toCanvasElement()).set({top: target.top, left: target.left});
        currentImage = { fabricImage: newImage as fabric.Image, embed: null, points: null, mask: null, pointLabels: null};
    } else if (target.type === 'group' || target.type === 'image') {
        currentImage = images.current?.find((image) => image.fabricImage === target);
        if (currentImage == null) {
            currentImage = { fabricImage: target as fabric.Image | fabric.Group, embed: null, points: null, mask: null, pointLabels: null};
            images.current?.push(currentImage);
        }
    }
    return currentImage;
}

export { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseWheel, findBoundingBox, findObjectInImages };
