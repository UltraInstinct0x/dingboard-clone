import { useCallback, useRef, useEffect } from "react";
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';
import { fabric } from 'fabric';
import Menu from './Menu';
import { encode, decode } from './models';
import { ImageObject, CustomCanvas } from './interfaces';
import { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseWheel, findBoundingBox } from './utils';

const useFabric = (canvas: React.MutableRefObject<fabric.Canvas | null>) => {
    const fabricRef = useCallback((element: HTMLCanvasElement | null) => {
        if (!element) {
            return canvas.current?.dispose();
        }
        canvas.current = new fabric.Canvas(element, {backgroundColor: 'Gainsboro', preserveObjectStacking: true});
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = 'white';
        fabric.Object.prototype.cornerStrokeColor = 'black';
        fabric.Object.prototype.borderColor = 'black';
    }, []);
    return fabricRef;
}
ort.env.wasm.wasmPaths = '/wasm-files/'

export default function Canvas() {
    const canvasIn = useRef<fabric.Canvas | null>(null);
    const canvasRef = useFabric(canvasIn);
    const images = useRef<ImageObject[]>([]);
    const encoderSession = useRef<ort.InferenceSession | null>(null);
    const decoderSession = useRef<ort.InferenceSession | null>(null);

    useEffect(() => {
        //segmentation
        fabric.Object.prototype.on('mousedown', segment);

        const canvas = canvasIn.current as CustomCanvas;
        canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });

        //drag and drop images to canvas
        canvas.on('dragover', handleDragOver);
        canvas.on('drop', handleOnDrop);

        //panning and zooming
        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);
        canvas.on('mouse:wheel', handleMouseWheel);

        console.log('canvas created');
      return () => {
        fabric.Object.prototype.off('mousedown', segment);
        canvas.off('dragover', handleDragOver);
        canvas.off('drop', handleOnDrop);
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
        canvas.off('mouse:wheel', handleMouseWheel);
        };
    }, []);

    //fix for webgpu not rendering when tab is not active
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && canvasIn?.current) {
                canvasIn?.current?.requestRenderAll();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        async function loadModels() {
            try {
                encoderSession.current = await ort.InferenceSession.create('/models/mobile_sam_encoder_no_preprocess.onnx', { executionProviders: ['webgpu'] });
                decoderSession.current = await ort.InferenceSession.create('/models/mobilesam.decoder.onnx', { executionProviders: ['webgpu'] });
            } catch (error) {
                console.error('Failed to load models:', error);
            }
        }
        loadModels();
        return () => {
            if (encoderSession.current) {
                encoderSession.current.release();
            }
            if (decoderSession.current) {
                decoderSession.current.release();
            }
        };
    }, []);

    function handleSelection(opt: fabric.IEvent) {
        /*
        const selected = opt.selected![0];
        const group = selected.group as fabric.Group;
        if (group) {
            group.set({
                borderColor: 'black',
                cornerColor: 'white',
                cornerStrokeColor: 'black',
                transparentCorners: false
            });
        }
        */
    }

    function segment(opt: fabric.IEvent) {
        const e = opt.e as MouseEvent;
        const currentImage = images.current.find((image) => image.fabricImage === opt.target);
        if (e.shiftKey && currentImage) {
            //scale the point to the image's local coords then to 1024x1024
            const mCanvas = currentImage.fabricImage.canvas?.viewportTransform as number[];
            const mImage = currentImage.fabricImage.calcTransformMatrix();
            const mTotal = fabric.util.multiplyTransformMatrices(mCanvas, mImage);
            const pointer = opt.pointer as fabric.Point;
            const point = new fabric.Point(pointer.x, pointer.y);
            const mPoint = fabric.util.transformPoint(point, fabric.util.invertTransform(mTotal));
            const currentImageHeight = currentImage.fabricImage.height as number;
            const currentImageWidth = currentImage.fabricImage.width as number;
            const x = mPoint.x + currentImageWidth / 2;
            const y = mPoint.y + currentImageHeight / 2;

            const targetWidth = 1024;
            const targetHeight = 1024;
            const target = opt.target as fabric.Image;
            const width = target.width as number;
            const height = target.height as number;
            const scaleX = targetWidth / width;
            const scaleY = targetHeight / height;
            const newX = x * scaleX;
            const newY = y * scaleY;

            if (currentImage.points == null) {
                currentImage.points = tf.tensor([[newX, newY]], [1, 2], 'float32') as tf.Tensor2D;
            } else {
                currentImage.points = tf.concat([currentImage.points, tf.tensor([[newX, newY]], [1, 2], 'float32')], 0) as tf.Tensor2D;
            }
            encodeDecode(currentImage);
        }
    }

    async function encodeDecode(current: ImageObject) {
        const originalImage = current.fabricImage as fabric.Image;
        const originalWidth = originalImage.width as number;
        const originalHeight = originalImage.height as number;

        if (current.embed == null) {
            current.embed = await encode(current, encoderSession);
        }
        //get mask
        const output = await decode(current, decoderSession);

        //apply mask to image, TODO: toCanvasElement returns 0,0,0,255 when transparent, turning it black
        const originalImageCanvas = originalImage.toCanvasElement({withoutTransform: true});
        const originalImageTensor = tf.image.resizeBilinear(tf.browser.fromPixels(originalImageCanvas), [1024, 1024]).reshape([1024*1024, 3]).concat(tf.ones([1024*1024, 1], 'float32').mul(255), 1);
        const maskImageData = output['masks'].toImageData();

        let maskTensor = tf.tensor(maskImageData.data, [maskImageData.data.length/4, 4], 'float32');
        maskTensor = maskTensor.slice([0,0], [-1, 3]);
        maskTensor = maskTensor.notEqual(0).any(1).cast('int32').reshape([maskImageData.data.length/4, 1]).tile([1,4]);
        let resultTensor = maskTensor.mul(originalImageTensor); 
        resultTensor = tf.image.resizeBilinear(resultTensor.reshape([1024, 1024, 4]) as tf.Tensor3D, [originalHeight, originalWidth]);
        const resultImageData = new ImageData(new Uint8ClampedArray(await resultTensor.data()), originalWidth, originalHeight);

        //transformations to match the mask on the image on the canvas 
        const boundingBox = findBoundingBox(resultTensor as tf.Tensor3D);
        const left = originalImage.left as number;
        const top = originalImage.top as number;
        // @ts-ignore
        const resImage = new fabric.Image(await createImageBitmap(resultImageData), {
            left: left + boundingBox.minX,
            top: top + boundingBox.minY,
            cropX: boundingBox.minX,
            cropY: boundingBox.minY,
            width: boundingBox.maxX - boundingBox.minX,
            height: boundingBox.maxY - boundingBox.minY,
        });
        const mImage = originalImage.calcTransformMatrix();
        const opt = fabric.util.qrDecompose(mImage);
        resImage.set(opt);
       
        const points = current.points as tf.Tensor2D;
        points.dispose();
        current.points = null;

        images.current.push({ fabricImage: resImage, embed: null, points: null });
        canvasIn?.current?.add(resImage);
        canvasIn?.current?.setActiveObject(resImage);

        originalImageTensor.dispose();
        maskTensor.dispose();
        resultTensor.dispose();
    }

    async function handleOnDrop(this: CustomCanvas, opt: fabric.IEvent) {
        const e = opt.e as DragEvent;
        e.preventDefault();

        const reader = new FileReader();
        reader.onload = (eventReader: ProgressEvent<FileReader>) => {
            const image = new Image();
            image.onload = () => {
                const imgInstance = new fabric.Image(image, {
                    left: e.x,
                    top: e.y,
                
                });
                canvasIn?.current?.add(imgInstance);
                images.current.push({ fabricImage: imgInstance, embed: null, points: null });
            }

            const target = eventReader.target as FileReader;
            image.src = target.result as string;
        };
        const dataTransfer = e.dataTransfer as DataTransfer;
        reader.readAsDataURL(dataTransfer.files[0]);
    }

    function handleDragOver(opt: fabric.IEvent) {
         opt.e.preventDefault();
     }


    return (
        <div>
            <div>
                <canvas id="canvas" ref={canvasRef} tabIndex={0}/> 
            </div>
            <div> 
                <Menu canvas={canvasIn}/>
            </div>
        </div>
    );
}
