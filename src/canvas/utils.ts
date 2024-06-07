import * as tf from '@tensorflow/tfjs';
import { CustomCanvas, ImageObject } from './interfaces';
import { fabric } from 'fabric';

function handleMouseDownPZ(this: CustomCanvas, opt: fabric.IEvent) {
  const evt = opt.e as MouseEvent;
  if (evt.metaKey === true) {
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  }
}
function handleMouseMovePZ(this: CustomCanvas, opt: fabric.IEvent) {
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
function handleMouseUpPZ(this: CustomCanvas) {
    this.isDragging = false;
    this.selection = true;
  // on mouse up we want to recalculate new interaction
    // for all objects, so we call setViewportTransform
    const viewportTransform = this.viewportTransform as number[];
    this.setViewportTransform(viewportTransform);
    this.isDragging = false;
    this.selection = true;
}
function handleMouseWheelPZ(this: CustomCanvas, opt: fabric.IEvent) {
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

function findObjectInImages(target: fabric.Object, images: React.MutableRefObject<ImageObject[] | null>): ImageObject {
    let currentImage;
    if (target.type == 'activeSelection') {
        const newImage = new fabric.Image(target.toCanvasElement()).set({top: target.top, left: target.left});
        currentImage = { fabricImage: newImage as fabric.Image, embed: null, points: null, mask: null, pointLabels: null, pointObjects: []};
    } else {
        currentImage = images.current?.find((image) => image.fabricImage === target);
        if (currentImage == null) {
            currentImage = { fabricImage: target as fabric.Image | fabric.Group, embed: null, points: null, mask: null, pointLabels: null, pointObjects: []};
            images.current?.push(currentImage);
        }
    }
    return currentImage;
}

async function getMaskImage(image: ImageObject, sliderValue: number): Promise<fabric.Image> {
    const res = tf.tidy(() => {
        const mask = image!.mask as tf.Tensor3D;
        const max = mask.max().dataSync()[0];
        const min = mask.min().dataSync()[0];
        const threshold = (max - min) * sliderValue / 100 + min;
        const clippedMask = mask.lessEqual(threshold);
        const clippedMaskInt = clippedMask.cast('int32').mul(255).tile([1, 1, 4]);
        return tf.image.resizeBilinear(clippedMaskInt as tf.Tensor3D, [image.fabricImage.height as number, image.fabricImage.width as number]).cast('int32');
    });
    const maskImageData = new ImageData(await tf.browser.toPixels(res as tf.Tensor3D) as Uint8ClampedArray, image.fabricImage.width as number, image.fabricImage.height as number);
    res.dispose();
    // @ts-ignore
    const mask = new fabric.Image(await createImageBitmap(maskImageData));
    return mask;
}

function deleteFromImagesRef(object: fabric.Object, images: React.MutableRefObject<ImageObject[] | null>) {
    if (images.current === null) throw new Error("Deleting from null imagesRef");

    const imageObject = images.current.find((image) => image.fabricImage === object);
    if (!imageObject) return;
    if (imageObject.embed) {
        imageObject.embed.dispose();
    }
    if (imageObject.points) {
        imageObject.points.dispose();
    }
    if (imageObject.pointLabels) {
        imageObject.pointLabels.dispose();
    }
    if (imageObject.mask) {
        imageObject.mask.dispose();
    }
    images.current = images.current.filter((image) => image.fabricImage !== object);
}

function followImage(point: fabric.Circle, image: fabric.Image | fabric.Group, transform: number[]) {
    const newTransform = fabric.util.multiplyTransformMatrices(image.calcTransformMatrix(), transform);
    const opt = fabric.util.qrDecompose(newTransform);
    point.setPositionByOrigin(
        // @ts-ignore
      { x: opt.translateX, y: opt.translateY },
      'center',
      'center'
    );
    point.set(opt);
    point.setCoords();
}

export { handleMouseDownPZ, handleMouseMovePZ, handleMouseUpPZ, handleMouseWheelPZ, findBoundingBox, findObjectInImages, getMaskImage, deleteFromImagesRef, followImage };
