import { LucideIcon } from 'lucide-react';

export type ToolType = 'select' | 'draw' | 'text' | 'image' | 'meme' | 'shape';

export interface ToolInfo {
  id: string;
  icon: LucideIcon;
  label: string;
  action: () => void;
  shortcut?: string;
  type?: 'button' | 'slider' | 'color';
  value?: number | string;
}
// UI Component Types
export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  onClick: () => void;
  isDanger?: boolean;
}