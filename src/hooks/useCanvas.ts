// hooks/useCanvas.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import type { ToolType, Point, DrawElement } from '../types';

interface ViewPort {
  zoom: number;
  offset: { x: number; y: number };
}

export function useCanvas(activeTool: ToolType) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef<Point | null>(null);
  const [viewport, setViewport] = useState<ViewPort>({
    zoom: 1,
    offset: { x: 0, y: 0 }
  });
  const drawPoints = useRef<Point[]>([]);

  // Initialize canvas with proper transform matrix
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set initial transform
    context.strokeStyle = '#b4befe';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Initial background
    context.fillStyle = '#181825';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const handleResize = () => {
      const prevTransform = context.getTransform();
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      context.setTransform(prevTransform);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Transform point from screen to canvas coordinates
  const screenToCanvas = useCallback((point: Point): Point => {
    const { zoom, offset } = viewport;
    return {
      x: (point.x - offset.x) / zoom,
      y: (point.y - offset.y) / zoom
    };
  }, [viewport]);

  // Handle zooming with proper matrix transformations
  const handleZoom = useCallback((delta: number, center: Point) => {
    setViewport(prev => {
      const zoomFactor = Math.pow(1.001, delta);
      const newZoom = Math.min(Math.max(0.1, prev.zoom * zoomFactor), 10);
      
      // Calculate zoom around mouse point
      const mousePoint = screenToCanvas(center);
      const scale = newZoom / prev.zoom;
      
      return {
        zoom: newZoom,
        offset: {
          x: center.x - (center.x - prev.offset.x) * scale,
          y: center.y - (center.y - prev.offset.y) * scale
        }
      };
    });
  }, [screenToCanvas]);

  // Pan handling
  const startPan = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 1 && e.altKey) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const pan = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !lastMousePos.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    setViewport(prev => ({
      ...prev,
      offset: {
        x: prev.offset.x + dx,
        y: prev.offset.y + dy
      }
    }));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const stopPan = useCallback(() => {
    setIsPanning(false);
    lastMousePos.current = null;
  }, []);

  // Drawing with viewport transform
  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'draw' || isPanning) return;

    const context = contextRef.current;
    if (!context) return;

    const point = screenToCanvas({ x: e.clientX, y: e.clientY });
    setIsDrawing(true);
    drawPoints.current = [point];

    context.save();
    context.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.offset.x, viewport.offset.y);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }, [activeTool, isPanning, viewport, screenToCanvas]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !contextRef.current) return;

    const point = screenToCanvas({ x: e.clientX, y: e.clientY });
    drawPoints.current.push(point);
    
    const context = contextRef.current;
    context.lineTo(point.x, point.y);
    context.stroke();
  }, [isDrawing, screenToCanvas]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !contextRef.current) return;

    contextRef.current.restore();
    setIsDrawing(false);
    drawPoints.current = [];
  }, [isDrawing]);

  return {
    canvasRef,
    viewport,
    handleZoom,
    startPan,
    pan,
    stopPan,
    startDrawing,
    draw,
    stopDrawing
  };
}