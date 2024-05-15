import { useRef,useEffect } from "react";
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web';

interface ImageWithZIndex {
    image: HTMLImageElement;
    embed: ort.Tensor | null;
    zIndex: number;
    x: number;
    y: number;
    points: tf.Tensor2D | null;
}

ort.env.wasm.wasmPaths = '/wasm-files/'

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const images = useRef<ImageWithZIndex[]>([]);
    const selectedImage = useRef<ImageWithZIndex | null>(null);
    const isDragging = useRef<boolean>(false);
    const dragStart = useRef<{ x: number, y: number } | null>(null);
    const encoderSession = useRef<ort.InferenceSession>(null);
    const decoderSession = useRef<ort.InferenceSession>(null);
    
    async function encode(image: ImageWithZIndex) {
        const resizedTensor = await ort.Tensor.fromImage(image.image, { resizedWidth: 1024, resizedHeight: 684 });
        const resizeImage = resizedTensor.toImageData();
        let imageDataTensor = await ort.Tensor.fromImage(resizeImage);
        const imageImageData = imageDataTensor.toImageData();

        let tf_tensor = tf.tensor(imageDataTensor.data, imageDataTensor.dims);
        tf_tensor = tf_tensor.reshape([3, 684, 1024]);
        tf_tensor = tf_tensor.transpose([1, 2, 0]).mul(255);

        //console.log('tf_tensor:', tf_tensor);
        imageDataTensor = new ort.Tensor(tf_tensor.dataSync(), tf_tensor.shape);

        if (encoderSession.current == null) {
            console.log('creating encoder session');
            encoderSession.current = await ort.InferenceSession.create('/models/mobilesam.encoder.onnx', { executionProviders: ['cpu'] });
            console.log('success creating encoder session');
        }
        const encoder_inputs = { "input_image": imageDataTensor };

        const output = await encoderSession.current.run(encoder_inputs);
        console.log('image_embedding:', output);
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

        const orig_im_size = tf.tensor([684, 1024], undefined, 'float32');
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
        //console.log('decoder_inputs:', decoder_inputs);

        if (decoderSession.current == null) {
            console.log('creating decoder session');
            decoderSession.current = await ort.InferenceSession.create('/models/mobilesam.decoder.onnx', { executionProviders: ['cpu'] });
            console.log('success creating decoder session');
        }
        const output = await decoderSession.current.run(decoder_inputs);
        //console.log('result:', output);
        return output;
    }
    /*
    //async function sendDataToBackend(data: tf.Tensor3D, embed: ort.Tensor): tf.Tensor3D {
        // Assuming you have an API endpoint to send the data
        // no cors
        const apiUrl = 'http://127.0.0.1:5000/image';
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: data.arraySync(), embed: embed}),
            });
            return await response.blob();
        } catch (error) {
            console.error('Error sending data to backend:', error);
        }
    }
    */
    async function handleOnDrop(e: DragEvent<HTMLCanvasElement>) {
        e.preventDefault();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

            const reader = new FileReader();
            reader.onload = (eventReader) => {
                const img = new Image();
                img.onload = async () => {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left + window.scrollX - img.width / 2;
                    const y = e.clientY - rect.top + window.scrollY - img.height / 2;
                    await ctx.drawImage(img, x, y, img.width, img.height); // Draw the image with its original size

                    images.current.push({ image: img, zIndex: images.current.length, x, y, embed: null, points: null});
                    await encode(images.current[images.current.length - 1]);
                };
                img.src = eventReader.target.result;
            };

            reader.readAsDataURL(e.dataTransfer.files[0]);
    }

    function handleOnMouseDown(e: MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        //find the image that was clicked on
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + window.scrollX;
        const y = e.clientY - rect.top + window.scrollY;
        dragStart.current = { x, y };
        const relativePoints = selectImage(images.current, x, y);
        drawImages();
        isDragging.current = selectedImage.current != null;
       // Check if ctrl key is pressed
        if (e.shiftKey && selectedImage.current != null) {
            const targetWidth = 1024;
            const targetHeight = 684;
            const scaleX = targetWidth / selectedImage.current.image.width;
            const scaleY = targetHeight / selectedImage.current.image.height;
            const newX = relativePoints['imageX'] * scaleX;
            const newY = relativePoints['imageY'] * scaleY;
            if (selectedImage.current.points == null) {
                selectedImage.current.points = tf.tensor([[newX, newY]], [1, 2], 'float32');
            } else {
                selectedImage.current.points = tf.concat([selectedImage.current.points, tf.tensor([[newX, newY]], [1, 2], 'float32')], 0);
            }
        }
    }

    function selectImage(images: ImageWithZIndex[], x: number, y: number): { imageX: number, imageY: number } | null{
        let selected = false;
        let temp = null;
        for (let i = images.length - 1; i >= 0; i--) {
            const image = images[i];
            if (x >= image.x && x <= image.x + image.image.width && y >= image.y && y <= image.y + image.image.height) {
                if (temp != null && temp.zIndex > image.zIndex) {
                    continue;
                }
                temp = image;
                selected = true;
            }
        }
        if (!selected) {
            selectedImage.current = null;
        } else {
            selectedImage.current = temp;
            return { imageX: x - temp.x, imageY: y - temp.y };
        }
    }

    function handleOnMouseUp(e: MouseEvent<HTMLCanvasElement>) {
        isDragging.current = false;
        dragStart.current = null;
    }

    function handleonMouseMove(e: MouseEvent<HTMLCanvasElement>) {
        if (isDragging.current && selectedImage.current != null) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + window.scrollX;
            const y = e.clientY - rect.top + window.scrollY;

            const deltaX = x - dragStart.current.x;
            const deltaY = y - dragStart.current.y;
            dragStart.current = { x, y };

            selectedImage.current.x += deltaX;
            selectedImage.current.y += deltaY;

            drawImages();
        }
    }

    async function handleOnKeyDown(e: KeyboardEvent<HTMLCanvasElement>) {
        if (e.key === 'c' && selectedImage.current != null) {
            const output = await decode(selectedImage.current);
            console.log(output['masks']);
            const imageData = output['masks'].toImageData();

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Create an ImageBitmap from the imageData
            const image = await createImageBitmap(imageData);

            // Original dimensions (example values, replace with your actual values)
            const originalWidth = selectedImage.current.image.width;
            const originalHeight = selectedImage.current.image.height;

            // Create a temporary canvas to scale the new image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            tempCanvas.width = originalWidth;
            tempCanvas.height = originalHeight;
            tempCanvas.globalAlpha = 0.5;

            // Clear the temporary canvas
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Draw the new image scaled on the temporary canvas
            tempCtx.drawImage(image, 0, 0, originalWidth, originalHeight);

            // Draw the temporary canvas image onto the original canvas
            ctx.drawImage(tempCanvas, selectedImage.current.x, selectedImage.current.y);

            // Reset the points
            selectedImage.current.points = null;
        }
    }

    function drawImages() {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        //clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const image of images.current) {
            if (selectedImage.current != null && selectedImage.current.image === image.image) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.strokeRect(image.x, image.y, image.image.width, image.image.height);
                ctx.drawImage(selectedImage.current.image, selectedImage.current.x, selectedImage.current.y);
                continue;
            }
            ctx.drawImage(image.image, image.x, image.y);
        }
    }

    return (
        <main>
            <canvas
                id="canvas"
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                tabIndex="0"
                className="bg-gray-700 outline-none"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleOnDrop}
                onMouseDown={handleOnMouseDown}
                onMouseUp={handleOnMouseUp}
                onMouseMove={handleonMouseMove}
                onKeyDown={handleOnKeyDown}
            ></canvas>
        </main>
    );
}
