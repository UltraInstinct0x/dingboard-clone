import * as tf from '@tensorflow/tfjs';

function findBoundingBox(tensor: tf.Tensor3D) {
        const [height, width, _] = tensor.shape;
        return tf.tidy(() => {  
            const mask = tensor.slice([0,0,3]);
            const opaqueMask = mask.greater(tf.scalar(0));
            const rowMaskArray = opaqueMask.any(1).arraySync() as number[][];
            const colMaskArray = opaqueMask.any(0).arraySync() as number[][];

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


export { findBoundingBox };
