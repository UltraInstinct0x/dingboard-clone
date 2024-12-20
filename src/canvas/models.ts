import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';
import { findBoundingBox } from './utils';
import { ImageObject } from './interfaces';
import { fabric } from 'fabric';

async function loadModel(session: React.MutableRefObject<ort.InferenceSession | null>, modelPath: string) {
    if (session.current != null) {
        console.log(`${modelPath} model already loaded`);
        return;
    }
    try {
        console.log(`trying to load ${modelPath} model with webgpu, cpu fallback`);
        session.current = await ort.InferenceSession.create(import.meta.env.BASE_URL + modelPath, { executionProviders: ['webgpu', 'cpu'], enableCpuMemArena: false });
        console.log(`${modelPath} model loaded`);
    } catch (error) {
        console.error(`Failed to load ${modelPath} model:`, error);
    }
}

async function preprocessImage(image: ImageObject): Promise<ort.Tensor> {
    const imageTensor = tf.tidy(() => {
        const canvasElement = image.fabricImage.toCanvasElement();
        let resizedImage = tf.image.resizeBilinear(tf.browser.fromPixels(canvasElement, 4), [1024, 1024]);
        const temp = resizedImage.reshape([1, 4, 1024, 1024]);
        return temp;
    });

    const imageData = new ImageData(new Uint8ClampedArray(await imageTensor.data()), 1024, 1024);
    const imageDataTensor = await ort.Tensor.fromImage(imageData);
    //const imageDataTensor = new ort.Tensor('float32', await imageTensor.data(), [1, 3, 1024, 1024]);
    imageTensor.dispose();
    return imageDataTensor;
}
async function postprocessImage(mask: ort.Tensor, originalImage: fabric.Image | fabric.Group): Promise<fabric.Image> {
    const originalImageCanvas = originalImage.toCanvasElement({ withoutTransform: true });
    const originalWidth = Math.round(originalImage.width as number);
    const originalHeight = Math.round(originalImage.height as number);

    const resultTensor = tf.tidy(() => {
        const originalImageTensor = tf.image.resizeBilinear(tf.browser.fromPixels(originalImageCanvas), [1024, 1024])
            .reshape([1024 * 1024, 3])
            .concat(tf.ones([1024 * 1024, 1], 'float32').mul(255), 1);
        
        const maskImageData = mask.toImageData();
        
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
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalWidth;
    tempCanvas.height = originalHeight;
    const tempCtx = tempCanvas.getContext('bitmaprenderer') as ImageBitmapRenderingContext;
    tempCtx.transferFromImageBitmap(await createImageBitmap(resultImageData));
    const resImage = new fabric.Image(tempCanvas, {
        left: left + boundingBox.minX,
        top: top + boundingBox.minY,
        cropX: boundingBox.minX,
        cropY: boundingBox.minY,
        width: boundingBox.maxX - boundingBox.minX,
        height: boundingBox.maxY - boundingBox.minY,
        // @ts-ignore
        src: tempCanvas.toDataURL(), //hack to make the image appear on load from local storage
    });
    
    const mImage = originalImage.calcTransformMatrix();
    const opt = fabric.util.qrDecompose(mImage);
    resImage.set(opt);

    resultTensor.dispose();
    return resImage;
}


//culprit, i wasnt scaling the image to 1024x1024 properly, ort.Tensor resize was just adding border 
async function encode(image: ImageObject, encoderSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<ort.Tensor> {

    const imageDataTensor = await preprocessImage(image) as ort.Tensor;
    const encoder_inputs = { "input_image": imageDataTensor };

    const output = await encoderSession.current!.run(encoder_inputs);
    const image_embedding = output['image_embeddings'];

    imageDataTensor.dispose(); 
    return image_embedding;
}

async function decode(image: ImageObject, decoderSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<fabric.Image> {
    if (image.pointLabels == null || image.points == null) {
        throw new Error("Segmenting without points or pointLabels");
    }
    //fix this
    const hasBoundingBoxTensor= image.pointLabels.equal(2).any(0).cast('bool');;
    const hasBoundingBox = (await hasBoundingBoxTensor.data())[0];
    console.log(hasBoundingBox);

    const point_coords = tf.tidy(() => {
        const input_points = image.points as tf.Tensor2D;
        if (!hasBoundingBox) {
            const additional_point = tf.tensor([[0.0, 0.0]], [1, 2], 'float32');
            return tf.concat([input_points, additional_point]).expandDims(0);
        }
        return input_points.expandDims(0);
    });
    const point_labels = tf.tidy(() => {
        const pointLabels = image.pointLabels as tf.Tensor1D;
        if (!hasBoundingBox) {
            return tf.concat([pointLabels, tf.tensor([-1], [1], 'float32')]).expandDims(0);
        }
        return pointLabels.expandDims(0);
    });

    const point_coords_ortTensor = new ort.Tensor('float32', new Float32Array(await point_coords.data()), point_coords.shape);

    const point_labels_ortTensor = new ort.Tensor('float32', new Float32Array(await point_labels.data()), point_labels.shape);

    const mask_input_ortTensor = new ort.Tensor('float32', new Float32Array((256 * 256 * 1)), [1, 1, 256, 256]);
    const has_mask_input_ortTensor = new ort.Tensor('float32', new Float32Array([0]), [1]);
    const orig_im_size_ortTensor = new ort.Tensor('float32', new Float32Array([1024, 1024]), [2]);

    const decoder_inputs = {
        "image_embeddings": image.embed,
        "point_coords": point_coords_ortTensor,
        "point_labels": point_labels_ortTensor,
        "mask_input": mask_input_ortTensor,
        "has_mask_input": has_mask_input_ortTensor,
        "orig_im_size": orig_im_size_ortTensor 
    } as ort.InferenceSession.OnnxValueMapType;

    const output = await decoderSession.current!.run(decoder_inputs) as ort.InferenceSession.OnnxValueMapType;

    hasBoundingBoxTensor.dispose();
    point_coords.dispose();
    point_labels.dispose();
    point_coords_ortTensor.dispose();
    point_labels_ortTensor.dispose();
    mask_input_ortTensor.dispose();
    has_mask_input_ortTensor.dispose();
    orig_im_size_ortTensor.dispose();

    const resultImage = await postprocessImage(output["masks"], image.fabricImage as fabric.Image | fabric.Group);

    output['masks'].dispose();
    output['iou_predictions'].dispose();
    output['low_res_masks'].dispose();

    return resultImage;

}

async function getSegment(current: ImageObject, encoderSession: React.MutableRefObject<ort.InferenceSession | null>, decoderSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<fabric.Image> {
    if (current.embed == null) {
        current.embed = await encode(current, encoderSession);
    }

    // Get mask
    const resImage = await decode(current, decoderSession);

    current.points?.dispose();
    current.points = null;
    current.pointLabels?.dispose();
    current.pointLabels = null;

    if (current.fabricImage.type === 'activeSelection') {
        current.embed.dispose();
    }

    return resImage;
}

async function getMaskTensor(image: ImageObject, depthSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<tf.Tensor3D> {
    let input = await preprocessImage(image) as ort.Tensor;
    const depth_inputs = {
        "image": input
    } as ort.InferenceSession.OnnxValueMapType;

    const output = (await depthSession.current!.run(depth_inputs) as ort.InferenceSession.OnnxValueMapType)["depth"] as ort.Tensor;

    const outputData = await output.getData() as Float32Array;
    const outputTensor = tf.tidy(() => {
        const depthTensor = tf.tensor(outputData, output.dims as number[], 'float32');
        const max = depthTensor.max();
        const min = depthTensor.min();
        let temp = tf.sub(depthTensor, min).div(tf.sub(max, min)).mul(255.0);
        temp = tf.reshape(temp, [1024, 1024, 1]);
        //temp = tf.image.resizeBilinear(temp, [originalImage.height as number, originalImage.width as number]).cast('int32');
        return temp;
    });

    return outputTensor as tf.Tensor3D;
}

export { loadModel, encode, decode, postprocessImage, getMaskTensor, getSegment};
