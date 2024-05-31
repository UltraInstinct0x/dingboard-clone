import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';

interface ImageObject {
    fabricImage: fabric.Image | fabric.Group;
    embed: ort.Tensor | null;
    points: tf.Tensor2D | null;
    mask: tf.Tensor3D | null;
}
interface CustomCanvas extends fabric.Canvas {
    lastPosX: number;
    lastPosY: number;
    isDragging: boolean;
}
interface MenuProps {
    top: number | null;
    left: number | null;
    handleDelete: () => void;
    handleGroup: () => void;
    handleUngroup: () => void;
    isSegment: boolean;
    handleSegment: () => void;
    handleRmbg: () => void;
    isRmbg: boolean;
    handleRmbgSlider: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    rmbgSliderValue: number;
}

export type { ImageObject, CustomCanvas, MenuProps };
