import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';

//culprit, i wasnt scaling the image to 1024x1024 properly, ort.Tensor resize was just adding border 
async function encode(image: ImageObject, encoderSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<ort.Tensor> {
    const imageTensor = tf.image.resizeBilinear(tf.browser.fromPixels(image.fabricImage.getElement()), [1024, 1024]).concat(tf.ones([1024, 1024, 1], 'float32').mul(255), 2);
    const imageData = new ImageData(new Uint8ClampedArray(await imageTensor.data()), 1024, 1024);
    imageTensor.dispose();
    const imageDataTensor = await ort.Tensor.fromImage(imageData);

    const encoder_inputs = { "input_image": imageDataTensor };

    const session = encoderSession.current ? encoderSession.current as ort.InferenceSession : null;
    if (session == null) {
        throw new Error('encoder not loaded');
    }
    const output = await session.run(encoder_inputs);
    const image_embedding = output['image_embeddings'];
    return image_embedding;

    imageDataTensor.dispose();
}

async function decode(image: ImageObject, decoderSession: React.MutableRefObject<ort.InferenceSession | null>): Promise<ort.InferenceSession.OnnxValueMapType> {
    const input_points = image.points as tf.Tensor2D;
    const additional_point = tf.tensor([[0.0, 0.0]], [1,2], 'float32')
    const point_coords = tf.concat([input_points, additional_point]).expandDims(0);
    const point_coords_ortTensor = new ort.Tensor('float32', new Float32Array(await point_coords.data()), point_coords.shape);

    const point_labels_points = tf.ones([input_points.shape[0]], 'float32');
    const point_labels = tf.concat([point_labels_points, tf.tensor([0], undefined, 'float32')]).expandDims(0);
    const point_labels_ortTensor = new ort.Tensor('float32', new Float32Array(await point_labels.data()), point_labels.shape);

    const mask_input = tf.zeros([1,1,256,256], 'float32');
    const mask_input_ortTensor = new ort.Tensor('float32', new Float32Array(await mask_input.data()), mask_input.shape);
    const has_mask_input = tf.zeros([1], 'float32');
    const has_mask_input_ortTensor = new ort.Tensor('float32', new Float32Array(await has_mask_input.data()), has_mask_input.shape);

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
    } as ort.InferenceSession.OnnxValueMapType;

    const session = decoderSession.current ? decoderSession.current as ort.InferenceSession : null;
    if (session == null) {
        throw new Error('decoder not loaded');
    }
    const output = await session.run(decoder_inputs) as ort.InferenceSession.OnnxValueMapType;

    additional_point.dispose();
    point_labels_points.dispose();
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


export { encode, decode };
