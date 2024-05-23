import { useCallback, useRef, useEffect, useState } from "react";
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
ort.env.wasm.wasmPaths = import.meta.env.BASE_URL + 'wasm-files/';

export default function Canvas() {
    const canvasIn = useRef<fabric.Canvas | null>(null);
    const canvasRef = useFabric(canvasIn);
    const images = useRef<ImageObject[]>([]);
    const encoderSession = useRef<ort.InferenceSession | null>(null);
    const decoderSession = useRef<ort.InferenceSession | null>(null);
    const [menuProps, setMenuProps] = useState<{ top: number | null, left: number | null }>({ top: null, left: null});
    const [isSegment, setIsSegment] = useState(false);
    const [deleteSelection, setDeleteSelection] = useState(false);
    const isSegmentRef = useRef(isSegment);
    const [group, setGroup] = useState(false);
    const [ungroup, setUngroup] = useState(false);

    useEffect(() => {
        isSegmentRef.current = isSegment;
    }, [isSegment]);
    useEffect(() => {
        //segmentation
        fabric.Object.prototype.on('mousedown', segment);

        const canvas = canvasIn.current as CustomCanvas;
        canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });

        fabric.Object.prototype.on('moving', updateMenu);
        canvas.on('selection:created', updateMenu);
        canvas.on('selection:updated', updateMenu);
        canvas.on('selection:cleared', hideMenu);

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
        canvas.off('moving', updateMenu);
        canvas.off('selection:created', updateMenu);
        canvas.off('selection:updated', updateMenu);
        canvas.off('selection:cleared', hideMenu);
        canvas.off('dragover', handleDragOver);
        canvas.off('drop', handleOnDrop);
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
        canvas.off('mouse:wheel', handleMouseWheel);

        setMenuProps({ top: null, left: null });
        setIsSegment(false);
        images.current.forEach((image) => {
            if (image.embed) {
                image.embed.dispose();
            }
        });
        images.current = [];
      }
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
                encoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL + 'models/mobile_sam_encoder_no_preprocess.onnx', { executionProviders: ['webgpu'] });
                decoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL +'models/mobilesam.decoder.onnx', { executionProviders: ['webgpu'] });
            } catch (error) {
                try {
                    encoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL + 'models/mobile_sam_encoder_no_preprocess.onnx', { executionProviders: ['cpu'] });
                    decoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL +'models/mobilesam.decoder.onnx', { executionProviders: ['cpu'] });
                }
                catch (error) {
                    console.error('Failed to load models:', error);
                }
            }
        }
        loadModels();
        return () => {
            if (encoderSession.current) {
                console.log('releasing encoder');
                encoderSession.current.release();
            }
            if (decoderSession.current) {
                console.log('releasing decoder');
                decoderSession.current.release();
            }
        };
    }, []);

    useEffect(() => {
        if (deleteSelection) {
            const activeObjects = canvasIn?.current?.getActiveObjects() as fabric.Object[];
            canvasIn?.current?.remove(...activeObjects);
            canvasIn?.current?.discardActiveObject();
            activeObjects?.forEach((object) => {
                deleteFromImagesRef(object);
            });
        }
        setDeleteSelection(false);
    }, [deleteSelection]);

    useEffect(() => {
        const activeObject = canvasIn?.current?.getActiveObject() as fabric.Group;
        if (!ungroup || activeObject == null || activeObject.type !== 'group') {
            setUngroup(false);
            return;
        }
        deleteFromImagesRef(activeObject);
        activeObject.toActiveSelection();
        setMenuProps(menuProps);
        setUngroup(false);
    },[ungroup]);
    
    function deleteFromImagesRef(object: fabric.Object) {
        const imageObject = images.current.find((image) => image.fabricImage === object);
        if (imageObject && imageObject.embed) {
            imageObject.embed.dispose();
            images.current = images.current.filter((image) => image.fabricImage !== object);
        }
    }

    useEffect(() => {
        const activeObject = canvasIn?.current?.getActiveObject() as fabric.ActiveSelection;
        if (!group || activeObject == null || activeObject.type !== 'activeSelection') {
            setGroup(false);
            return;
        }
        activeObject.toGroup();
        setGroup(false);
    },[group]);

    function hideMenu() {
        setMenuProps({ top: null, left: null });
        setIsSegment(false);
    }

    function updateMenu(opt: fabric.IEvent) {
        function getGlobalCoords(source: fabric.Object): fabric.Point {
            const mCanvas = source.canvas?.viewportTransform as number[];
            const point = new fabric.Point(source.left as number, source.top as number);
            return fabric.util.transformPoint(point, mCanvas);
        }
        //finding the target image
        let point;
        if (opt.transform) { //moving
            point = getGlobalCoords(opt.transform.target);
        } else if (opt.selected![0].group) { // selecting a group
            point = getGlobalCoords(opt.selected![0].group);
        } else { //selecting an image
            point = getGlobalCoords(opt.selected![0]);
        }
        setMenuProps({ top: point.y as number - 30, left: point.x as number });
    }

    function segment(opt: fabric.IEvent) {
        let currentImage;
        const target = opt.target as fabric.Object;

        if (target == null || !isSegmentRef.current) {
            return;
        }

        if (target.type === 'activeSelection') {
            const newImage = new fabric.Image(target.toCanvasElement()).set({top: target.top, left: target.left});
            currentImage = { fabricImage: newImage, embed: null, points: null };
        } else if (target.type === 'group' || target.type === 'image') {
            currentImage = images.current.find((image) => image.fabricImage === target);
            if (currentImage == null) {
                currentImage = { fabricImage: target as fabric.Object, embed: null, points: null };
                images.current.push(currentImage);
            }
        }

        if (isSegmentRef.current && currentImage) {
            setIsSegment(false);
            console.log('segmenting');
            //scale the point to the image's local coords then to 1024x1024
            const mCanvas = canvasIn?.current?.viewportTransform as number[];
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
                const oldPoints = currentImage.points;
                currentImage.points = tf.concat([currentImage.points, tf.tensor([[newX, newY]], [1, 2], 'float32')], 0) as tf.Tensor2D;
                oldPoints.dispose();

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

        // Get mask
        const output = await decode(current, decoderSession);

        // Apply mask to image, TODO: toCanvasElement returns 0,0,0,255 when transparent, turning it black
        const originalImageCanvas = originalImage.toCanvasElement({ withoutTransform: true });
        
        const resultTensor = await tf.tidy(() => {
            const originalImageTensor = tf.image.resizeBilinear(tf.browser.fromPixels(originalImageCanvas), [1024, 1024])
                .reshape([1024 * 1024, 3])
                .concat(tf.ones([1024 * 1024, 1], 'float32').mul(255), 1);
            
            const maskImageData = output['masks'].toImageData();
            
            const maskTensor = tf.tensor(maskImageData.data, [maskImageData.data.length / 4, 4], 'float32')
                .slice([0, 0], [-1, 3])
                .notEqual(0).any(1).cast('int32').reshape([maskImageData.data.length / 4, 1]).tile([1, 4]);
            
            let resultTensor = maskTensor.mul(originalImageTensor);
            resultTensor = tf.image.resizeBilinear(resultTensor.reshape([1024, 1024, 4]) as tf.Tensor3D, [originalHeight, originalWidth]);
            
            return resultTensor;
        });

        // Transformations to match the mask on the image on the canvas 
        const resultImageData = new ImageData(new Uint8ClampedArray(await resultTensor.data()), originalWidth, originalHeight);
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

        canvasIn?.current?.add(resImage);
        canvasIn?.current?.setActiveObject(resImage);

        if (current.fabricImage.type === 'activeSelection') {
            current.embed.dispose();
        }

        resultTensor.dispose();
        output['masks'].dispose();
        output['iou_predictions'].dispose();
        output['low_res_masks'].dispose();
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
                <Menu top={menuProps.top} left={menuProps.left} isSegment={isSegment} setIsSegment={setIsSegment} setDeleteSelection={setDeleteSelection} setGroup={setGroup} setUngroup={setUngroup} />
            </div>
        </div>
    );
}
