import { useCallback, useRef, useEffect, useState } from "react";
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';
import { fabric } from 'fabric';
import Menu from './Menu';
import { encode, decode, loadModel, depth } from './models';
import { ImageObject, CustomCanvas } from './interfaces';
import { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseWheel} from './utils';
import UndoButton from './UndoButton';

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

const depthModelPath = 'models/depth_anything_vits14.onnx';
const encoderModelPath = 'models/mobile_sam_encoder_no_preprocess.onnx';
const decoderModelPath = 'models/mobilesam.decoder.onnx';
//const rmbgModelPath = 'models/rmbg.quantized.onnx';
ort.env.wasm.wasmPaths = import.meta.env.BASE_URL + 'wasm-files/';
if (self.crossOriginIsolated) {
    ort.env.wasm.numThreads = Math.ceil(navigator.hardwareConcurrency / 2);
} else {
    ort.env.wasm.numThreads = 1;
}
console.log('numThreads:', ort.env.wasm.numThreads);

export default function Canvas() {
    const canvasIn = useRef<fabric.Canvas | null>(null);
    const stack = useRef<String[]>([]);
    const canvasRef = useFabric(canvasIn, stack);
    const images = useRef<ImageObject[]>([]);

    const encoderSession = useRef<ort.InferenceSession | null>(null);
    const decoderSession = useRef<ort.InferenceSession | null>(null);
    //const rmbgSession = useRef<ort.InferenceSession | null>(null);
    const depthSession = useRef<ort.InferenceSession | null>(null);

    const [menuPos, setMenuPos] = useState<{ top: number | null, left: number | null }>({ top: null, left: null});
    const [isSegment, setIsSegment] = useState(false);
    const [isRmbg, setIsRmbg] = useState(false);
    const [rmbgSliderValue, setRmbgSliderValue] = useState(0);
    const isSegmentRef = useRef(isSegment);
    isSegmentRef.current = isSegment;

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

        //undo 
        canvas.on('object:added', saveState);
        canvas.on('object:modified', saveState);

      return () => {
        fabric.Object.prototype.off('mousedown', segment);
        fabric.Object.prototype.off('moving', updateMenu);
        canvas.off('selection:created', updateMenu);
        canvas.off('selection:updated', updateMenu);
        canvas.off('selection:cleared', hideMenu);
        canvas.off('dragover', handleDragOver);
        canvas.off('drop', handleOnDrop);
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
        canvas.off('mouse:wheel', handleMouseWheel);
        canvas.off('object:added', saveState);
        canvas.off('object:modified', saveState);

        setMenuPos({ top: null, left: null });
        setIsSegment(false);
        setIsRmbg(false);
        images.current.forEach((image) => {
            if (image.embed) {
                image.embed.dispose();
            }
            if (image.points) {
                image.points.dispose();
            }
            if (image.mask) {
                image.mask.dispose();
            }
        });
        images.current = [];
        usingSlider.current = false;
        
      }
    }, []);

    //save canvas state to local storage
    useEffect(() => {
        function unload() {
            localStorage.setItem('canvas', JSON.stringify(canvasIn.current?.toJSON()));
            localStorage.setItem('stack', JSON.stringify(stack.current));
        }
        window.addEventListener('unload', unload);
        return () => {
            window.removeEventListener('unload', unload);
        }
    },[]);

    //fix for canavs not rendering when tab is not active
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && canvasIn.current) {
                canvasIn.current?.requestRenderAll();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        loadModel(encoderSession, encoderModelPath);
        loadModel(decoderSession, decoderModelPath);
        loadModel(depthSession, depthModelPath);
        return () => {
            if (encoderSession.current) {
                console.log('releasing encoder');
                encoderSession.current.release();
            }
            if (decoderSession.current) {
                console.log('releasing decoder');
                decoderSession.current.release();
            }
            if (depthSession.current) {
                console.log('releasing depthSession');
                depthSession.current.release();
            }
            encoderSession.current = null;
            decoderSession.current = null;
            depthSession.current = null;
        };
    }, []);

    function hideMenu() {
        setMenuPos({ top: null, left: null });
        setIsSegment(false);
        setIsRmbg(false);

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
        setMenuPos({ top: point.y as number - 30, left: point.x as number });
    }

    function saveState() {
        if (stack.current.length > 10) {
            stack.current.shift();
        }
        const canvasState = JSON.stringify(canvasIn.current?.toJSON());
        stack.current.push(canvasState);
    }

    function segment(opt: fabric.IEvent) {
        let currentImage;
        const target = opt.target as fabric.Object;

        if (target == null || !isSegmentRef.current) {
            return;
        }

        if (target.type === 'activeSelection') {
            const newImage = new fabric.Image(target.toCanvasElement()).set({top: target.top, left: target.left});
            currentImage = { fabricImage: newImage as fabric.Image, embed: null, points: null, mask: null };
        } else if (target.type === 'group' || target.type === 'image') {
            currentImage = images.current.find((image) => image.fabricImage === target);
            if (currentImage == null) {
                currentImage = { fabricImage: target as fabric.Image | fabric.Group, embed: null, points: null, mask: null};
                images.current.push(currentImage);
            }
        }

        if (isSegmentRef.current && currentImage) {
            console.log('segmenting');
            //scale the point to the image's local coords then to 1024x1024
            const mCanvas = canvasIn.current?.viewportTransform as number[];
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
            setIsSegment(false);
        }
    }

    async function encodeDecode(current: ImageObject) {
        if (current.embed == null) {
            current.embed = await encode(current, encoderSession);
        }

        // Get mask
        const resImage = await decode(current, decoderSession);

        current.points?.dispose();
        current.points = null;

        canvasIn.current?.add(resImage);
        canvasIn.current?.setActiveObject(resImage);

        if (current.fabricImage.type === 'activeSelection') {
            current.embed.dispose();
        }
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
                canvasIn.current?.add(imgInstance);
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

    function handleDelete() {
        const activeObjects = canvasIn.current?.getActiveObjects() as fabric.Object[];
        canvasIn.current?.remove(...activeObjects);
        canvasIn.current?.discardActiveObject();
        activeObjects?.forEach((object) => {
            deleteFromImagesRef(object);
        });
    }

    function handleUngroup() {
        const activeObject = canvasIn.current?.getActiveObject() as fabric.Group;
        if (activeObject == null || activeObject.type !== 'group') {
            return;
        }
        deleteFromImagesRef(activeObject);
        activeObject.toActiveSelection();
        setMenuPos(menuPos);
    }
    
    function deleteFromImagesRef(object: fabric.Object) {
        const imageObject = images.current.find((image) => image.fabricImage === object);
        if (imageObject && imageObject.embed) {
            imageObject.embed.dispose();
            images.current = images.current.filter((image) => image.fabricImage !== object);
        }
    }

    function handleGroup() {
        const activeObject = canvasIn.current?.getActiveObject() as fabric.ActiveSelection;
        if (activeObject == null || activeObject.type !== 'activeSelection') {
            return;
        }
        activeObject.toGroup();
        setMenuPos(menuPos);
    }

    function handleUndo() {
        if (stack.current.length > 1) {
            stack.current.pop();
            const canvasState = stack.current.pop();
            canvasIn.current?.loadFromJSON(canvasState, () => {
                canvasIn.current?.renderAll();
            });
        }
    }
    
    function handleSegment() {
        setIsSegment((prev) => !prev);
    }

    async function handleRmbg(){ 
        if (isRmbg) {
            setIsRmbg(false);
            return;
        }

        const current = canvasIn.current?.getActiveObject();
        if (current?.type == 'image' || current?.type == 'group') {
            let currentImage = images.current.find((image) => image.fabricImage === current);
            if (currentImage == null) {
                currentImage = { fabricImage: current as fabric.Image | fabric.Group, embed: null, points: null, mask: null};
                images.current.push(currentImage);
            }
            let resMask;
            if (currentImage.mask == null) {
                resMask = await depth(currentImage, depthSession);
                currentImage.mask = resMask;
            } else {
                resMask = currentImage.mask;
            }
            setRmbgSliderValue(0);
            setIsRmbg(true);
        }
    }

    async function getClipImage(image: ImageObject, sliderValue: number) {
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
    
    const usingSlider = useRef(false);
    async function handleRmbgSlider(e: React.ChangeEvent<HTMLInputElement>) {
        if (!isRmbg) {
            return;
        }
        if (usingSlider.current) {
            return;
        }
        usingSlider.current = true;
        setRmbgSliderValue(parseInt(e.target.value));
        const current = canvasIn.current?.getActiveObject();
        if (current?.type == 'image' || current?.type == 'group') {
            let currentImage = images.current.find((image) => image.fabricImage === current);
            if (currentImage == null) {
                return;
            }
            const maskImage = await getClipImage(currentImage, parseInt(e.target.value))
            maskImage.set({top: 0, left: 0, originX: 'center', originY: 'center', inverted: true});
            currentImage.fabricImage.clipPath = maskImage;
            currentImage.fabricImage.dirty = true;
            canvasIn.current?.renderAll();
        }
        usingSlider.current = false;
    }

    return (
        <div>
            <div>
                <canvas id="canvas" ref={canvasRef} tabIndex={0}/> 
            </div>
            <div> 
                <Menu top={menuPos.top} left={menuPos.left} isSegment={isSegment} handleSegment={handleSegment} handleDelete={handleDelete} handleGroup={handleGroup} handleUngroup={handleUngroup} handleRmbg={handleRmbg} isRmbg={isRmbg} handleRmbgSlider={handleRmbgSlider} rmbgSliderValue={rmbgSliderValue}/>
                <UndoButton handleUndo={handleUndo}/>
            </div>
        </div>
    );
}
