export type BaseElement = {
  id: string;
  x: number;
  y: number;
  isSelected?: boolean;
};

export type TextElement = BaseElement & {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
};

export type ImageElement = BaseElement & {
  type: 'image';
  width: number;
  height: number;
  data: HTMLImageElement;
};

export type DrawElement = BaseElement & {
  type: 'draw';
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

export type CanvasElement = TextElement | ImageElement | DrawElement;