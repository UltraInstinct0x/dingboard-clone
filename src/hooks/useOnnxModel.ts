import { useEffect, useRef } from 'react';
import * as ort from 'onnxruntime-web/webgpu';

export function useOnnxModel(modelPath: string) {
  const sessionRef = useRef<ort.InferenceSession | null>(null);

  useEffect(() => {
    async function loadModel() {
      try {
        const session = await ort.InferenceSession.create(modelPath);
        sessionRef.current = session;
      } catch (error) {
        console.error('Error loading model:', error);
      }
    }

    loadModel();

    return () => {
      if (sessionRef.current) {
        sessionRef.current.release();
        sessionRef.current = null;
      }
    };
  }, [modelPath]);

  return sessionRef;
}
