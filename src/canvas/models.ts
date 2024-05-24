import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';
import { ImageObject } from './interfaces';

async function loadModels(encoderSession: React.MutableRefObject<ort.InferenceSession | null>, decoderSession: React.MutableRefObject<ort.InferenceSession | null>) {
    if (encoderSession.current != null && decoderSession.current != null) {
        console.log('models already loaded');
        return;
    }
    try {
        console.log('trying to load models with webgpu');
        encoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL + 'models/mobile_sam_encoder_no_preprocess.onnx', { executionProviders: ['webgpu'] });
        decoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL +'models/mobilesam.decoder.onnx', { executionProviders: ['webgpu'] });
        console.log('loaded models with webgpu');
    } catch (error) {
        try {
            console.log('failed to load webgpu, trying cpu');
            encoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL + 'models/mobile_sam_encoder_no_preprocess.onnx', { executionProviders: ['cpu'] });
            decoderSession.current = await ort.InferenceSession.create(import.meta.env.BASE_URL + 'models/mobilesam.decoder.onnx', { executionProviders: ['cpu'] });
            console.log('loaded models with cpu');
        }
        catch (error) {
            console.error('Failed to load models:', error);
        }
    }
}
//culprit, i wasnt scaling the image to 1024x1024 properly, ort.Tensor resize was just adding border 
async function encode(image: ImageObject, encoderSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<ort.Tensor> {
    const imageTensor = tf.tidy(() => {
        const canvasElement = image.fabricImage.toCanvasElement();
        const resizedImage = tf.image.resizeBilinear(tf.browser.fromPixels(canvasElement), [1024, 1024]);
        return resizedImage.concat(tf.ones([1024, 1024, 1], 'float32').mul(255), 2);
    });

    const imageData = new ImageData(new Uint8ClampedArray(await imageTensor.data()), 1024, 1024);
    imageTensor.dispose();

    const imageDataTensor = await ort.Tensor.fromImage(imageData);

    const encoder_inputs = { "input_image": imageDataTensor };

    const session = encoderSession.current ? encoderSession.current as ort.InferenceSession : null;
    if (session == null) {
        imageDataTensor.dispose(); 
        throw new Error('encoder not loaded');
    }

    const output = await session.run(encoder_inputs);
    const image_embedding = output['image_embeddings'];

    imageDataTensor.dispose(); 
    return image_embedding;
}

async function decode(image: ImageObject, decoderSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<ort.InferenceSession.OnnxValueMapType> {
    const point_coords = tf.tidy(() => {
        const input_points = image.points as tf.Tensor2D;
        const additional_point = tf.tensor([[0.0, 0.0]], [1, 2], 'float32');
        const point_coords = tf.concat([input_points, additional_point]).expandDims(0);
        return point_coords;
    });
    const point_coords_ortTensor = new ort.Tensor('float32', new Float32Array(await point_coords.data()), point_coords.shape);

    const point_labels = tf.tidy(() => {
        const input_points = image.points as tf.Tensor2D;
        const point_labels_points = tf.ones([input_points.shape[0]], 'float32');
        const point_labels = tf.concat([point_labels_points, tf.tensor([0], undefined, 'float32')]).expandDims(0);
        return point_labels;
    });
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

    const session = decoderSession.current ? decoderSession.current as ort.InferenceSession : null;
    if (session == null) {
        point_coords_ortTensor.dispose();
        point_labels_ortTensor.dispose();
        mask_input_ortTensor.dispose();
        has_mask_input_ortTensor.dispose();
        orig_im_size_ortTensor.dispose();
        throw new Error('decoder not loaded');
    }

    const output = await session.run(decoder_inputs) as ort.InferenceSession.OnnxValueMapType;

    point_coords.dispose();
    point_coords_ortTensor.dispose();
    point_labels.dispose();
    point_labels_ortTensor.dispose();
    mask_input_ortTensor.dispose();
    has_mask_input_ortTensor.dispose();
    orig_im_size_ortTensor.dispose();

    return output;
}
export { encode, decode, loadModels};
