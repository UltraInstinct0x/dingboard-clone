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

    //culprit, i wasnt scaling the image to 1024x1024 properly, ort.Tensor resize was just adding border, used canvas to scale image
    async function encode(image: ImageWithZIndex) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.height = 1024;
        tempCanvas.width = 1024;
        tempCtx.drawImage(image.fabricImage.getElement(), 0, 0, 1024, 1024);
        const imageData = tempCtx.getImageData(0, 0, 1024, 1024);
        
        const imageDataTensor = await ort.Tensor.fromImage(imageData);
        //ctx.drawImage(await createImageBitmap(imageDataTensor.toImageData()), 0, 0, 1024, 1024);

        if (encoderSession.current == null) {
            console.log('creating encoder session');
            encoderSession.current = await ort.InferenceSession.create('/models/mobile_sam_encoder_no_preprocess.onnx', { executionProviders: ['webgpu'] });
            console.log('success creating encoder session');
        }
        const encoder_inputs = { "input_image": imageDataTensor };

        const output = await encoderSession.current.run(encoder_inputs);
        const image_embedding = output['image_embeddings'];
        image.embed = image_embedding;
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

        if (decoderSession.current == null) {
            console.log('creating decoder session');
            decoderSession.current = await ort.InferenceSession.create('/models/mobilesam.decoder.onnx', { executionProviders: ['webgpu'] });
            console.log('success creating decoder session');
        }
        const output = await decoderSession.current.run(decoder_inputs);
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
            //decode and resize to original image size
            const output = await decode(selectedImage.current);
            const imageData = output['masks'].toImageData();
            const tempImage = await createImageBitmap(imageData);
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.height = selectedImage.current.fabricImage.height;
            tempCanvas.width = selectedImage.current.fabricImage.width;
            tempCtx.drawImage(tempImage, 0, 0, 1024, 1024, 0, 0, selectedImage.current.fabricImage.width, selectedImage.current.fabricImage.height);

            //transformations to match the image on the canvas 
            const image = new fabric.Image(tempCanvas, {
                left: selectedImage.current.fabricImage.left,
                top: selectedImage.current.fabricImage.top,
            });
            const canvas = canvasRef.current;
            const mCanvas = canvas.viewportTransform;
            const mImage = selectedImage.current.fabricImage.calcTransformMatrix();
            const mTotal = fabric.util.multiplyTransformMatrices(mCanvas, mImage);
            const opt = fabric.util.qrDecompose(mTotal);
            image.set(opt);
            canvas.add(image);

            selectedImage.current.points = null;
        }
    }

    return (
        <main>
            <canvas id="canvas" width={window.innerWidth} height={window.innerHeight} tabIndex={0} /> 
        </main>
    );
}
