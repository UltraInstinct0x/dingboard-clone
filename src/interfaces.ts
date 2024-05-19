import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';

interface ImageObject {
    fabricImage: fabric.Image;
    embed: ort.Tensor | null;
    points: tf.Tensor2D | null;
}
interface CustomCanvas extends fabric.Canvas {
    lastPosX: number;
    lastPosY: number;
    isDragging: boolean;
}

export { ImageObject, CustomCanvas };
