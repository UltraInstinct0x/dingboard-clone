import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web/webgpu';

interface ImageObject {
    fabricImage: fabric.Image | fabric.Group;
    embed: ort.Tensor | null;
    points: tf.Tensor2D | null;
    pointObjects: fabric.Circle[];
    mask: tf.Tensor3D | null;
    pointLabels: tf.Tensor1D | null;
}

interface CropRect extends fabric.Rect {
    origTop: number;
    origLeft: number;
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
    handleIsSegment: () => void;
    handleRmbg: () => void;
    isRmbg: boolean;
    handleRmbgSlider: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    rmbgSliderValue: number;
    isCrop: boolean;
    handleIsCrop: () => void;
}
interface SegmentMenuProps {
    top: number | null;
    left: number | null;
    isSegment: boolean;
    isAddPositivePoint: boolean;
    handleIsAddPositivePoint: () => void;
    isAddNegativePoint: boolean;
    handleIsAddNegativePoint: () => void;
    handleSegment: () => void;
}

export type { ImageObject, CustomCanvas, MenuProps, SegmentMenuProps, CropRect };
