import { useCallback, useRef } from 'react';
import * as ort from 'onnxruntime-web/webgpu';
import * as tf from '@tensorflow/tfjs';

export function useBackgroundRemoval() {
  const modelRef = useRef<ort.InferenceSession | null>(null);

  const initModel = useCallback(async (modelPath: string) => {
    try {
      const model = await ort.InferenceSession.create(modelPath);
      modelRef.current = model;
    } catch (error) {
      console.error('Error loading background removal model:', error);
      throw error;
    }
  }, []);

  const removeBg = useCallback(async (
    imageData: ImageData,
    threshold: number = 0.5
  ) => {
    if (!modelRef.current) {
      throw new Error('Model not initialized');
    }

    try {
      // Convert image to tensor
      const imageTensor = new ort.Tensor(
        'float32',
        new Float32Array(imageData.data),
        [1, 3, imageData.height, imageData.width]
      );

      // Run inference
      const result = await modelRef.current.run({
        input: imageTensor
      });

      // Convert mask to tensor
      const maskTensor = tf.tensor(result.output.data, [imageData.height, imageData.width, 1]);
      
      // Apply threshold
      const thresholdedMask = maskTensor.greater(threshold);
      
      // Create binary mask
      const binaryMask = thresholdedMask.asType('float32');

      return binaryMask;
    } catch (error) {
      console.error('Error removing background:', error);
      throw error;
    }
  }, []);

  return {
    initModel,
    removeBg
  };
}
