import { useRef, useEffect, useState } from "react";
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';
import { fabric } from 'fabric';
import Menu from './Menu';
import { getSegment, loadModel, getMaskTensor } from './models';
import { ImageObject, CustomCanvas, CropRect } from './interfaces';
import { handleMouseDownPZ, handleMouseMovePZ, handleMouseUpPZ, handleMouseWheelPZ, findObjectInImages, getMaskImage, deleteFromImagesRef, followImage } from './utils';
import UndoButton from './UndoButton';
import SegmentMenu from './SegmentMenu';
import { useFabric } from './customHooks';

const depthModelPath = 'models/depth_anything_vits14.onnx';
const encoderModelPath = 'models/mobile_sam_encoder_no_preprocess.onnx';
const decoderModelPath = 'models/mobilesam.decoder.onnx';
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
    const depthSession = useRef<ort.InferenceSession | null>(null);

    const [isRmbg, setIsRmbg] = useState(false);
    const [rmbgSliderValue, setRmbgSliderValue] = useState(0);

    const [menuPos, setMenuPos] = useState<{ top: number | null, left: number | null }>({ top: null, left: null});

    const [segmentMenuPos, setSegmentMenuPos] = useState<{ top: number | null, left: number | null }>({ top: null, left: null });
    const [isSegment, setIsSegment] = useState(false);
    const isSegmentRef = useRef(isSegment);
    isSegmentRef.current = isSegment;

    const [isCrop, setIsCrop] = useState(false);
    const isCropRef = useRef(isCrop);
    isCropRef.current = isCrop;
    // @ts-ignore
    const cropRectRef = useRef<CropRect>(new fabric.Rect({
            stroke: '#ccc',
            strokeDashArray: [2, 2],
            visible: false,
            selectable: false,
            fill:'transparent',
    }));
    const isCropMoveRef = useRef(false);
    const cropTargetRef = useRef<fabric.Object | null>(null);

    useEffect(() => {
        //segmentation
        fabric.Object.prototype.on('mousedown', addPoint);

        
        const canvas = canvasIn.current as CustomCanvas;
        canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });

        fabric.Object.prototype.on('moving', updateMenu);
        fabric.Object.prototype.on('scaling', updateMenu);
        fabric.Object.prototype.on('rotating', updateMenu);
        canvas.on('selection:created', updateMenu);
        canvas.on('selection:updated', updateMenu);
        canvas.on('selection:cleared', hideMenu);

        //drag and drop images to canvas
        canvas.on('dragover', handleDragOver);
        canvas.on('drop', handleOnDrop);

        //panning and zooming
        canvas.on('mouse:down', handleMouseDownPZ);
        canvas.on('mouse:move', handleMouseMovePZ);
        canvas.on('mouse:up', handleMouseUpPZ);
        canvas.on('mouse:wheel', handleMouseWheelPZ);

        //undo 
        canvas.on('object:modified', saveState);

        //cropping
        canvas.on('mouse:down', cropImageMouseDown);
        canvas.on('mouse:move', cropImageMouseMove);
        canvas.on('mouse:up', cropImageMouseUp);
        canvas.add(cropRectRef.current);

      return () => {
        fabric.Object.prototype.off('mousedown', addPoint);
        fabric.Object.prototype.off('moving', updateMenu);
        fabric.Object.prototype.off('scaling', updateMenu);
        fabric.Object.prototype.off('rotating', updateMenu);
        canvas.off('selection:created', updateMenu);
        canvas.off('selection:updated', updateMenu);
        canvas.off('selection:cleared', hideMenu);
        canvas.off('dragover', handleDragOver);
        canvas.off('drop', handleOnDrop);
        canvas.off('mouse:down', handleMouseDownPZ);
        canvas.off('mouse:move', handleMouseMovePZ);
        canvas.off('mouse:up', handleMouseUpPZ);
        canvas.off('mouse:wheel', handleMouseWheelPZ);
        canvas.off('object:modified', saveState);
        canvas.off('mouse:down', cropImageMouseDown);
        canvas.off('mouse:move', cropImageMouseMove);
        canvas.off('mouse:up', cropImageMouseUp);
        canvas.remove(cropRectRef.current);

        setMenuPos({ top: null, left: null });
        setIsSegment(false);
        setIsRmbg(false);
        setIsCrop(false);
        images.current.forEach(image => {
            if (image.embed) {
                image.embed.dispose();
            }
            if (image.points) {
                image.points.dispose();
            }
            if (image.mask) {
                image.mask.dispose();
            }
            if (image.pointLabels) {
                image.pointLabels.dispose();
            }
            canvasIn.current?.remove(...image.pointObjects);
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

    function saveState() {
        if (stack.current.length > 10) {
            stack.current.shift();
        }
        const canvasState = JSON.stringify(canvasIn.current?.toJSON());
        stack.current.push(canvasState);
    }

    function hideMenu() {
        setMenuPos({ top: null, left: null });
        setIsSegment(false);
        setIsRmbg(false);
        setIsAddPositivePoint(false);
        setIsAddNegativePoint(false);
        images.current.forEach(image =>{
            if (image.points) image.points.dispose();
            if (image.pointLabels) image.pointLabels.dispose();
            image.points = null;
            image.pointLabels = null;
            canvasIn.current?.remove(...image.pointObjects);
        });
    }
    function updateMenu(opt: fabric.IEvent) {
        function getGlobalCoords(source: fabric.Object): fabric.Point[] {
            const oCoords = source.oCoords!;
            const pointTL = new fabric.Point(oCoords.tl.x, oCoords.tl.y);
            const pointTR = new fabric.Point(oCoords.tr.x, oCoords.tr.y);
            return [pointTL, pointTR];
        }
        //finding the target image
        let points;
        if (opt.transform) { //moving
            points = getGlobalCoords(opt.transform.target);
        } else if (opt.selected![0].group) { // selecting a group
            points = getGlobalCoords(opt.selected![0].group);
        } else { //selecting an image
            points = getGlobalCoords(opt.selected![0]);
        }
        setMenuPos({ top: points[0].y as number , left: points[0].x - 50 as number });
        setSegmentMenuPos({ top: points[1].y as number, left: points[1].x + 17 as number });
    }

        
    //drag and drop images
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
                saveState();
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

    //menu handlers
    function handleGroup() {
        const activeObject = canvasIn.current?.getActiveObject() as fabric.ActiveSelection;
        if (activeObject == null || activeObject.type !== 'activeSelection') {
            return;
        }
        activeObject.toGroup();
        setMenuPos(menuPos);
    }
    function handleUngroup() {
        const activeObject = canvasIn.current?.getActiveObject() as fabric.Group;
        if (activeObject == null || activeObject.type !== 'group') {
            return;
        }
        deleteFromImagesRef(activeObject, images);
        activeObject.toActiveSelection();
        setMenuPos(menuPos);
    }
    function handleDelete() {
        const activeObjects = canvasIn.current?.getActiveObjects() as fabric.Object[];
        canvasIn.current?.remove(...activeObjects);
        canvasIn.current?.discardActiveObject();
        activeObjects?.forEach((object) => {
            deleteFromImagesRef(object, images);
        });
        saveState();
    }
    function handleUndo() {
        if (stack.current.length > 1) {
            stack.current.pop();
            const canvasState = stack.current[stack.current.length - 1];
            canvasIn.current?.loadFromJSON(canvasState, () => {
                canvasIn.current?.renderAll();
            });
        }
    }
    function handleIsSegment() {
        setIsSegment((prev) => !prev);
    }

    //rmbg handlers
    async function handleRmbg(){ 
        if (isRmbg) {
            setIsRmbg(false);
            return;
        }

        const current = canvasIn.current?.getActiveObject() as fabric.Object;
        if (current?.type == 'activeSelection') {
            console.log("cant rmbg on multiple images, group first");
            return;
        }

        const currentImage = findObjectInImages(current, images);
        let resMask;
        if (currentImage.mask == null) {
            resMask = await getMaskTensor(currentImage, depthSession);
            currentImage.mask = resMask;
        } else {
            resMask = currentImage.mask;
        }
        setRmbgSliderValue(0);
        setIsRmbg(true);
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
            const maskImage = await getMaskImage(currentImage, parseInt(e.target.value))
            maskImage.set({top: 0, left: 0, originX: 'center', originY: 'center', inverted: true});
            currentImage.fabricImage.clipPath = maskImage;
            currentImage.fabricImage.dirty = true;
            canvasIn.current?.renderAll();
        }
        usingSlider.current = false;
    }

    //SegmentMenu handlers
    const [isAddPositivePoint, setIsAddPositivePoint] = useState(false);
    const [isAddNegativePoint, setIsAddNegativePoint] = useState(false);
    const isAddPositivePointRef = useRef(isAddPositivePoint);
    isAddPositivePointRef.current = isAddPositivePoint;
    const isAddNegativePointRef = useRef(isAddNegativePoint);
    isAddNegativePointRef.current = isAddNegativePoint;

    function handleIsAddPositivePoint() {
        setIsAddPositivePoint(prev => !prev);
        setIsAddNegativePoint(false);
    }
    function handleIsAddNegativePoint() {
        setIsAddNegativePoint(prev => !prev);
        setIsAddPositivePoint(false);
    }
    async function handleSegment() {
        setIsAddPositivePoint(false);
        setIsAddNegativePoint(false);
        setIsSegment(false);

        const target = canvasIn.current?.getActiveObject() as fabric.Object;
        const currentImage = findObjectInImages(target, images);
        const resImage =  await getSegment(currentImage, encoderSession, decoderSession);

        
        canvasIn.current?.remove(...currentImage.pointObjects);
        canvasIn.current?.add(resImage);
        saveState();
        canvasIn.current?.setActiveObject(resImage);

        currentImage.points?.dispose();
        currentImage.points = null;
        currentImage.pointLabels?.dispose();
        currentImage.pointLabels = null;

    }
    function addPoint(opt: fabric.IEvent) {
        const target = opt.target as fabric.Object;
        if (target == null || (!isAddPositivePointRef.current && !isAddNegativePointRef.current)) return;
        
        const currentImage = findObjectInImages(target, images);
        
        if (!currentImage) return;

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
        const width = target.width as number;
        const height = target.height as number;
        const scaleX = targetWidth / width;
        const scaleY = targetHeight / height;
        const newX = x * scaleX;
        const newY = y * scaleY;

        if (currentImage.points == null) {
            currentImage.points = tf.tensor([[newX, newY]], [1, 2], 'float32') as tf.Tensor2D;
        } else {
            currentImage.points = tf.tidy(() => {
             return tf.concat([currentImage.points!, tf.tensor([[newX, newY]], [1, 2], 'float32')], 0) as tf.Tensor2D;
            });
        }

        if (currentImage.pointLabels == null) {
            currentImage.pointLabels = tf.ones([1], 'float32');
        } else {
            currentImage.pointLabels = tf.tidy(() => {
                let temp: tf.Tensor1D;
                if (isAddPositivePointRef.current) {
                    temp = tf.ones([1], 'float32') as tf.Tensor1D;
                } else if(isAddNegativePointRef.current) {
                    temp = tf.tensor([0], [1], 'float32') as tf.Tensor1D;
                } else {
                    throw new Error("setting pointLabel when not adding any point");
                }
                return tf.concat([currentImage.pointLabels!, temp]) as tf.Tensor1D;
            });
        }

        let color;
        if (isAddPositivePointRef.current) {
            color = 'green';
        } else if (isAddNegativePointRef.current) {
            color = 'red';
        } else {
            color = 'black';
        }
        const newPoint = new fabric.Circle({ radius: 5, fill: color, originX: 'center', originY: 'center', left: pointer.x, top: pointer.y });
        const transform = fabric.util.multiplyTransformMatrices(fabric.util.invertTransform(currentImage.fabricImage.calcTransformMatrix()), newPoint.calcTransformMatrix());
        currentImage.fabricImage.on('moving', followImage.bind(null, newPoint, currentImage.fabricImage, transform));
        currentImage.fabricImage.on('scaling', followImage.bind(null, newPoint, currentImage.fabricImage, transform));
        currentImage.fabricImage.on('rotating', followImage.bind(null, newPoint, currentImage.fabricImage, transform));
        currentImage.pointObjects.push(newPoint);
        canvasIn.current?.add(newPoint);

        setIsAddPositivePoint(false);
        setIsAddNegativePoint(false);
    }

    //cropping 
    function handleIsCrop() {
        const activeObject = canvasIn.current?.getActiveObject();
        if (!activeObject) return;
        cropTargetRef.current = activeObject;
        setIsCrop(prev => !prev);
    }
    function cropImageMouseDown(opt: fabric.IEvent) {
        if (!isCropRef.current) return;

        const pointer = opt.absolutePointer as fabric.Point;
        //lock movement
        const cropTarget = cropTargetRef.current as fabric.Object;
        cropTarget.set({ lockMovementX: true, lockMovementY: true });

        cropRectRef.current.width = 10;
        cropRectRef.current.height = 10;
        cropRectRef.current.left = pointer.x;
        cropRectRef.current.top = pointer.y;
        cropRectRef.current.origLeft = pointer.x;
        cropRectRef.current.origTop = pointer.y;
        cropRectRef.current.visible = true;
        canvasIn.current?.bringToFront(cropRectRef.current);

        isCropMoveRef.current = true;
    }
    const cropImageMouseMovingRef = useRef(false)
    function cropImageMouseMove(opt: fabric.IEvent) {
        if (!isCropMoveRef.current) return;
        if (cropImageMouseMovingRef.current) return;
        cropImageMouseMovingRef.current = true;

        const pointer = opt.absolutePointer as fabric.Point;

        const height = pointer.y-cropRectRef.current.origTop;
        const width = pointer.x-cropRectRef.current.origLeft;
        
        if (width > 0 && height > 0) {
            cropRectRef.current.set({ left: cropRectRef.current.origLeft, top: cropRectRef.current.origTop });
        } else if (width < 0 && height > 0) {
            cropRectRef.current.set({ left: pointer.x, top: cropRectRef.current.origTop });
        }
        else if (width > 0 && height < 0) {
            cropRectRef.current.set({ left: cropRectRef.current.origLeft, top: pointer.y });
        }
        else {
            cropRectRef.current.set({ left: pointer.x, top: pointer.y });
        }
        cropRectRef.current.width = Math.abs(width);
        cropRectRef.current.height = Math.abs(height);

        cropRectRef.current.dirty = true;
        canvasIn.current?.renderAll();
        cropImageMouseMovingRef.current = false;
    }
    function cropImageMouseUp() {
        if (!isCropMoveRef.current) return;
        
        const activeObject = cropTargetRef.current as fabric.Object;
        activeObject.set({ lockMovementX: false, lockMovementY: false });

        const mImage = activeObject.calcTransformMatrix();
        const mInverse = fabric.util.invertTransform(mImage);
        const pointClicked = new fabric.Point(cropRectRef.current.left as number, cropRectRef.current.top as number);
        //point is relative to center of image
        const point = fabric.util.transformPoint(pointClicked, mInverse);

        /*
        if (!activeObject.clipPath) {
            const clipGroup = new fabric.Group([
                new fabric.Rect({
                    left: point.x,
                    top: point.y,
                    width: cropRectRef.current.width,
                    height: cropRectRef.current.height,
                })]
            );
            activeObject.clipPath = clipGroup;
        } else {
            console.log('adding clipPath');
            activeObject.clipPath.addWithUpdate(new fabric.Rect({  
                left: point.x,
                top: point.y,
                width: cropRectRef.current.width,
                height: cropRectRef.current.height,
                inverted: true,
            }));
        }
        */
        const clone = new fabric.Image(activeObject.toCanvasElement());
        clone.set({
            left: cropRectRef.current.left,
            top: cropRectRef.current.top,
            width: cropRectRef.current.width,
            height: cropRectRef.current.height,
            cropX: (point.x + activeObject.width! / 2) * activeObject.scaleX!,
            cropY: (point.y + activeObject.height! / 2) * activeObject.scaleY!,
        });
        canvasIn.current?.add(clone);
        canvasIn.current?.bringToFront(clone);
        saveState();
        canvasIn.current?.setActiveObject(clone);

        setIsCrop(false);
        isCropMoveRef.current = false;
        cropTargetRef.current = null;
        cropRectRef.current.visible = false;

        activeObject.dirty = true;
        canvasIn.current?.renderAll();
    }
    
    //keyboard shortcuts
    async function handleKeyDown(e: React.KeyboardEvent) {
        if (e.ctrlKey && e.key === 'z') {
            handleUndo();
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            const clipboardItems = await navigator.clipboard.read();
            for (const clipboardItem of clipboardItems) {
                if (!(clipboardItem.types.includes('image/png') || clipboardItem.types.includes('image/jpeg'))) continue; 
                const blob = await clipboardItem.getType('image/png') || await clipboardItem.getType('image/jpeg');
                const reader = new FileReader();
                reader.onload = (eventReader: ProgressEvent<FileReader>) => {
                    const image = new Image();
                    image.onload = () => {
                        const imgInstance = new fabric.Image(image);
                        canvasIn.current?.add(imgInstance);
                        saveState();
                    }
                    const target = eventReader.target as FileReader;
                    image.src = target.result as string;
                };
                reader.readAsDataURL(blob);
            }
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const activeObject = canvasIn.current?.getActiveObject() as fabric.Object;
            activeObject.toCanvasElement().toBlob( blob => {
                if (!blob) return;
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            });
        }
        else if (e.key === 's') {
            if (e.ctrlKey) {
                saveState();
            } else {
                handleIsSegment();
            }
        }
        else if (e.key === 'r') {
            handleRmbg();
        }
        else if (e.key === 'Backspace') {
            handleDelete();
        }
        else if (e.key === 'g') {
            handleGroup();
        }
        else if (e.key === 'u') {
            handleUngroup();
        } else if (e.key === 'p') {
            if (!isSegment) return;
            handleIsAddPositivePoint();
        } else if (e.key === 'n') {
            if (!isSegment) return;
            handleIsAddNegativePoint();
        } else if (e.key === 'Enter') {
            handleSegment();
        } else if (e.key === 'c') {
            handleIsCrop();
        }
        return;
    }

    return (
        <div onKeyDown={handleKeyDown} tabIndex={0}>
            <div>
                <canvas id="canvas" ref={canvasRef} /> 
            </div>
            <div> 
                <Menu 
                    top={menuPos.top} 
                    left={menuPos.left} 
                    isSegment={isSegment} 
                    handleIsSegment={handleIsSegment} 
                    handleDelete={handleDelete} 
                    handleGroup={handleGroup} 
                    handleUngroup={handleUngroup} 
                    handleRmbg={handleRmbg} 
                    isRmbg={isRmbg} 
                    handleRmbgSlider={handleRmbgSlider} 
                    rmbgSliderValue={rmbgSliderValue}
                    isCrop={isCrop}
                    handleIsCrop={handleIsCrop}
                />
                <SegmentMenu 
                    top={segmentMenuPos.top} 
                    left={segmentMenuPos.left} 
                    isSegment={isSegment} 
                    isAddPositivePoint={isAddPositivePoint} 
                    handleIsAddPositivePoint={handleIsAddPositivePoint} 
                    isAddNegativePoint={isAddNegativePoint}
                    handleIsAddNegativePoint={handleIsAddNegativePoint}
                    handleSegment={handleSegment}
                />
                <UndoButton handleUndo={handleUndo}/>
            </div>
        </div>
    );
}
