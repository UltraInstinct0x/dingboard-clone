// src/hooks/useSegmentation.ts
import * as ort from 'onnxruntime-web/webgpu';
import { useCallback, useRef } from 'react';
import type { Point } from '../types';

export interface SegmentationPoint extends Point {
  label: number; // 1 for positive, 0 for negative
}

export function useSegmentation() {
  const modelRef = useRef<ort.InferenceSession | null>(null);
  const encoderRef = useRef<ort.InferenceSession | null>(null);
  
  const initModel = useCallback(async (encoderPath: string, decoderPath: string) => {
    try {
      // Load the SAM model - it's split into encoder and decoder
      const encoder = await ort.InferenceSession.create(encoderPath);
      const decoder = await ort.InferenceSession.create(decoderPath);
      
      encoderRef.current = encoder;
      modelRef.current = decoder;
    } catch (error) {
      console.error('Error initializing segmentation models:', error);
      throw error;
    }
  }, []);

  const generateMask = useCallback(async (
    imageData: ImageData,
    points: SegmentationPoint[],
  ) => {
    if (!modelRef.current || !encoderRef.current) {
      throw new Error('Model not initialized');
    }

    try {
      // Convert image to tensor
      const imageTensor = new ort.Tensor(
        'float32',
        new Float32Array(imageData.data),
        [1, 3, imageData.height, imageData.width]
      );

      // Convert points to tensors
      const pointsTensor = new ort.Tensor(
        'float32',
        new Float32Array(points.flatMap(p => [p.x, p.y])),
        [1, points.length, 2]
      );

      const labelsTensor = new ort.Tensor(
        'float32',
        new Float32Array(points.map(p => p.label)),
        [1, points.length]
      );

      // Run encoder
      const encoderResult = await encoderRef.current.run({
        image: imageTensor
      });

      // Run decoder with encoded image and points
      const result = await modelRef.current.run({
        image_embeddings: encoderResult.image_embeddings,
        point_coords: pointsTensor,
        point_labels: labelsTensor
      });

      return result.masks;
    } catch (error) {
      console.error('Error generating mask:', error);
      throw error;
    } finally {
      // Clean up tensors
      imageTensor?.dispose();
      pointsTensor?.dispose();
      labelsTensor?.dispose();
    }
  }, []);

  return {
    initModel,
    generateMask
  };
}