import { useRef, useEffect } from "react";
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';
import { fabric } from 'fabric';

interface ImageWithZIndex {
    fabricImage: fabric.Image;
    embed: ort.Tensor | null;
    points: tf.Tensor2D | null;
}

ort.env.wasm.wasmPaths = '/wasm-files/'
export default function App() {
    const canvasRef = useRef<fabric.Canvas>(null);
    const images = useRef<ImageWithZIndex[]>([]);
    const selectedImage = useRef<ImageWithZIndex | null>(null);
    const encoderSession = useRef<ort.InferenceSession>(null);
    const decoderSession = useRef<ort.InferenceSession>(null);

    useEffect(() => {
        const canvas = new fabric.Canvas('canvas', {
            backgroundColor: 'gray',
            preserveObjectStacking: true,
        });
        canvas.on('mouse:down', handleOnMouseDown);
        canvas.on('dragover', handleDragOver);
        canvas.on('drop', handleOnDrop);
        canvas.on('selection:updated', (opt: fabric.IEvent) => {
            selectedImage.current = images.current.find((image) => image.fabricImage === opt.selected[0]);
        });
        canvas.on('selection:created', (opt: fabric.IEvent) => {
            selectedImage.current = images.current.find((image) => image.fabricImage === opt.selected[0]);
        });
        canvas.on('selection:cleared', () => {
            selectedImage.current = null;
        });
        canvas.on('mouse:down', function(opt) {
          var evt = opt.e;
          if (evt.metaKey === true) {
            this.isDragging = true;
            this.selection = false;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
          }
        });
        canvas.on('mouse:move', function(opt) {
          if (this.isDragging) {
            var e = opt.e;
            var vpt = this.viewportTransform;
            vpt[4] += e.clientX - this.lastPosX;
            vpt[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
          }
        });
        canvas.on('mouse:up', function(opt) {
          // on mouse up we want to recalculate new interaction
          // for all objects, so we call setViewportTransform
          this.setViewportTransform(this.viewportTransform);
          this.isDragging = false;
          this.selection = true;
        });
        canvas.on('mouse:wheel', function(opt) {
          var delta = opt.e.deltaY;
          var zoom = canvas.getZoom();
          zoom *= 0.999 ** delta;
          if (zoom > 20) zoom = 20;
          if (zoom < 0.01) zoom = 0.01;
          canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
          opt.e.preventDefault();
          opt.e.stopPropagation();
        });
        
        canvasRef.current = canvas;
        return () => {
            canvas.dispose();
        }
        console.log('canvas created');
    }, []);
    useEffect(() => {
        window.addEventListener('keydown', handleOnKeyDown);
        return () => {
            window.removeEventListener('keydown', handleOnKeyDown);
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

    //culprit, i wasnt scaling the image to 1024x1024 properly, ort.Tensor resize was just adding border, used canvas to scale image
    async function encode(image: ImageWithZIndex) {
        const imageTensor = tf.image.resizeBilinear(tf.browser.fromPixels(image.fabricImage.getElement()), [1024, 1024]).concat(tf.ones([1024, 1024, 1], 'float32').mul(255), 2);
        const imageData = new ImageData(new Uint8ClampedArray(await imageTensor.data()), 1024, 1024);
        imageTensor.dispose();
        const imageDataTensor = await ort.Tensor.fromImage(imageData);

        const encoder_inputs = { "input_image": imageDataTensor };

        const output = await encoderSession.current.run(encoder_inputs);
        const image_embedding = output['image_embeddings'];
        image.embed = image_embedding;

        imageDataTensor.dispose();
    }

    async function decode(image: ImageWithZIndex) {
        const input_points = image.points;
        const additional_point = tf.tensor([[0.0, 0.0]], [1,2], 'float32')
        const input_points_minus1D = tf.concat([input_points, additional_point]);
        const point_coords = input_points_minus1D.expandDims(0);
        const point_coords_typedArray = new Float32Array(await point_coords.data());
        const point_coords_ortTensor = new ort.Tensor('float32', point_coords_typedArray, point_coords.shape);

        const point_labels_points = tf.ones([input_points.shape[0]], 'float32');
        const point_labels_minus1D = tf.concat([point_labels_points, tf.tensor([0], undefined, 'float32')]); 
        const point_labels = point_labels_minus1D.expandDims(0);
        const point_labels_typedArray = new Float32Array(await point_labels_minus1D.data());
        const point_labels_ortTensor = new ort.Tensor('float32', point_labels_typedArray, point_labels.shape);

        const mask_input = tf.zeros([1,1,256,256], 'float32');
        const mask_input_typedArray = new Float32Array(await mask_input.data());
        const mask_input_ortTensor = new ort.Tensor('float32', mask_input_typedArray, mask_input.shape);
        const has_mask_input = tf.zeros([1], 'float32');
        const has_mask_input_typedArray = new Float32Array(await has_mask_input.data());
        const has_mask_input_ortTensor = new ort.Tensor('float32', has_mask_input_typedArray, has_mask_input.shape);

        const orig_im_size = tf.tensor([1024, 1024], undefined, 'float32');
        const orig_im_size_typedArray = new Float32Array(await orig_im_size.data());
        const orig_im_size_ortTensor = new ort.Tensor('float32', orig_im_size_typedArray, orig_im_size.shape);

        const decoder_inputs = {
            "image_embeddings": image.embed,
            "point_coords": point_coords_ortTensor,
            "point_labels": point_labels_ortTensor,
            "mask_input": mask_input_ortTensor,
            "has_mask_input": has_mask_input_ortTensor,
            "orig_im_size": orig_im_size_ortTensor 
        }

        const output = await decoderSession.current.run(decoder_inputs);

        additional_point.dispose();
        input_points_minus1D.dispose();
        point_labels_points.dispose();
        point_labels_minus1D.dispose();
        point_labels.dispose();
        mask_input.dispose();
        has_mask_input.dispose();
        orig_im_size.dispose();

        point_coords_ortTensor.dispose();
        point_labels_ortTensor.dispose();
        mask_input_ortTensor.dispose();
        has_mask_input_ortTensor.dispose();
        orig_im_size_ortTensor.dispose();

        return output;
    }   
    function handleOnMouseDown(opt: fabric.IEvent) {
        if (opt.e.shiftKey && selectedImage.current != null) {
            //scale the point to the image's local coords then to 1024x1024
            const canvas = canvasRef.current;
            const mCanvas = canvas.viewportTransform;
            const mImage = selectedImage.current.fabricImage.calcTransformMatrix();
            const mTotal = fabric.util.multiplyTransformMatrices(mCanvas, mImage);
            const point = new fabric.Point(opt.pointer.x, opt.pointer.y);
            const mPoint = fabric.util.transformPoint(point, fabric.util.invertTransform(mTotal));
            const x = mPoint.x + selectedImage.current.fabricImage.width / 2;
            const y = mPoint.y + selectedImage.current.fabricImage.height / 2;

            const targetWidth = 1024;
            const targetHeight = 1024;
            const scaleX = targetWidth / opt.target.width;
            const scaleY = targetHeight / opt.target.height;
            const newX = x * scaleX;
            const newY = y * scaleY;
            if (selectedImage.current.points == null) {
                selectedImage.current.points = tf.tensor([[newX, newY]], [1, 2], 'float32');
            } else {
                selectedImage.current.points = tf.concat([selectedImage.current.points, tf.tensor([[newX, newY]], [1, 2], 'float32')], 0);
            }
        }
    }

    async function handleOnDrop(opt: fabric.IEvent) {
        const e = opt.e;
        e.preventDefault();

        const canvas = canvasRef.current;
        const reader = new FileReader();
        reader.onload = async (eventReader) => {
            const image = new Image();
            image.onload = async () => {
                const imgInstance = new fabric.Image(image, {
                    left: e.x,
                    top: e.y,
                    borderColor: 'black',
                    cornerColor: 'white',
                    cornerStrokeColor: 'black',
                    transparentCorners: false
                });
                canvas.add(imgInstance);
                images.current.push({ fabricImage: imgInstance, embed: null, points: null });
                await encode(images.current[images.current.length - 1]);
            }
            image.src = eventReader.target.result;
        };
        reader.readAsDataURL(e.dataTransfer.files[0]);
    }

    function handleDragOver(opt) {
         opt.e.preventDefault();
     };

    async function handleOnKeyDown(e: KeyboardEvent) {
        if (e.key === 'c' && selectedImage.current != null) {
            const originalWidth = selectedImage.current.fabricImage.width;
            const originalHeight = selectedImage.current.fabricImage.height;

            if (selectedImage.current.embed == null) {
                await encode(selectedImage.current);
            }
            //get mask
            const output = await decode(selectedImage.current);

            //apply mask to image 
            const originalImageCanvas = selectedImage.current.fabricImage.toCanvasElement({withoutTransform: true});
            const originalImageTensor = tf.image.resizeBilinear(tf.browser.fromPixels(originalImageCanvas), [1024, 1024]).reshape([1024*1024, 3]).concat(tf.ones([1024*1024, 1], 'float32').mul(255), 1);
            const maskImageData = output['masks'].toImageData();

            let maskTensor = tf.tensor(maskImageData.data, [maskImageData.data.length/4, 4], 'float32');
            maskTensor = maskTensor.slice([0,0], [-1, 3]);
            maskTensor = maskTensor.notEqual(0).any(1).cast('int32').reshape([maskImageData.data.length/4, 1]).tile([1,4]);
            let resultTensor = maskTensor.mul(originalImageTensor); 
            resultTensor = tf.image.resizeBilinear(resultTensor.reshape([1024, 1024, 4]), [originalHeight, originalWidth]);
            const resultImageData = new ImageData(new Uint8ClampedArray(await resultTensor.data()), originalWidth, originalHeight);

            //transformations to match the mask on the image on the canvas 
            const boundingBox = findBoundingBox(resultTensor);
            const image = new fabric.Image(await createImageBitmap(resultImageData), {
                left: selectedImage.current.fabricImage.left + boundingBox.minX,
                top: selectedImage.current.fabricImage.top + boundingBox.minY,
                cropX: boundingBox.minX,
                cropY: boundingBox.minY,
                width: boundingBox.maxX - boundingBox.minX,
                height: boundingBox.maxY - boundingBox.minY,
                borderColor: 'black',
                cornerColor: 'white',
                cornerStrokeColor: 'black',
                transparentCorners: false
            });
            const canvas = canvasRef.current;
            const mImage = selectedImage.current.fabricImage.calcTransformMatrix();
            const opt = fabric.util.qrDecompose(mImage);
            image.set(opt);
            
            selectedImage.current.points.dispose();
            selectedImage.current.points = null;
            images.current.push({ fabricImage: image, embed: null, points: null });
            canvas.add(image);

            canvas.setActiveObject(image);

            originalImageTensor.dispose();
            maskTensor.dispose();
            resultTensor.dispose();
        }
    }

    function findBoundingBox(tensor: tf.tensor3D) {
        const [height, width, channels] = tensor.shape;
        return tf.tidy(() => {  
            const mask = tensor.slice([0,0,3]);
            const opaqueMask = mask.greater(tf.scalar(0));
            const rowMaskArray = opaqueMask.any(1).arraySync();
            const colMaskArray = opaqueMask.any(0).arraySync();

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


    return (
        <main>
            <canvas id="canvas" width={window.innerWidth} height={window.innerHeight} tabIndex={0} /> 
        </main>
    );
}
