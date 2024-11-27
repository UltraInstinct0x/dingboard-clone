import { LucideIcon } from 'lucide-react';

// Tool and Modifier Types
export type ToolType = 'select' | 'draw' | 'text' | 'import' | 'meme' | 'export' | 'settings';

export interface ModifierAction {
  description: string;
  icon?: string;
  action?: () => void;
}

export interface ToolInfo {
  name: ToolType;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  status: string;
  description: string;
  modifierActions?: {
    cmd?: ModifierAction;
    shift?: ModifierAction;
    alt?: ModifierAction;
    ctrl?: ModifierAction;
  };
}

// Layer and Canvas Types
interface Layer {
  id: string;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  type: 'background' | 'drawing' | 'preview' | 'ui';
  isVisible: boolean;
}

export interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  selectedObjects: string[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

// Drawing and Element Types
export interface DrawElement {
  id: string;
  type: 'path' | 'text' | 'image' | 'group';
  points?: Point[];
  text?: string;
  imageUrl?: string;
  children?: string[]; // For groups
  selected?: boolean;
  style?: {
    strokeStyle?: string;
    lineWidth?: number;
    font?: string;
  };
}
export interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  selectedObjects: string[];
}
// UI Component Types
export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  onClick: () => void;
  isDanger?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  accessibility: {
    highContrast: boolean;
    keyboardShortcuts: boolean;
    tooltipDelay: number;
  };
}