// src/components/Toolbar.tsx
import React, { useEffect } from 'react';
import { LoginButton } from './LoginButton';
import { Tooltip } from './Tooltip';
import { useTools } from '../hooks/useTools';
import { 
  Type, Trash2, Copy, MoveUp, MoveDown, 
  Palette, Minus, Plus, XCircle ,Undo2, Redo2, Eraser
} from 'lucide-react';
import type { ToolInfo } from '../types';

interface ToolbarProps {
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ className = '' }) => {
  const { 
    tools, 
    activeTool, 
    handleToolClick, 
    toolStatus,
    showMemeSearch,
    setShowMemeSearch,
    selectedElements // You'll need to add this to useTools
  } = useTools();

  const getDynamicControls = (): ToolInfo[] => {
    // Default controls (undo/redo)
    const defaultControls = [
      {
        id: 'undo',
        icon: Undo2,
        label: 'Undo',
        action: () => console.log('Undo'),
        shortcut: '⌘Z'
      },
      {
        id: 'redo',
        icon: Redo2,
        label: 'Redo',
        action: () => console.log('Redo'),
        shortcut: '⌘⇧Z'
      }
    ];

    if (activeTool === 'draw') {
      return [
        ...defaultControls,
        {
          id: 'eraser',
          icon: Eraser,
          label: 'Eraser',
          action: () => console.log('Toggle eraser')
        },
        {
          id: 'size',
          icon: Minus,
          label: 'Brush Size',
          action: () => {},
          type: 'slider',
          value: 2
        },
        // ... rest of draw controls
      ];
    }

    // Only show undo/redo for other tools
    return defaultControls;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center p-2">
      {/* Centered toolbar */}
      <div className="flex items-center justify-center">
        <div className="flex items-center justify-center gap-1 bg-secondary/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg">
          {tools.map(({ name, icon: Icon, shortcut, label }) => (
            <Tooltip
              key={name}
              content={
                <div className="text-center">
                  <div className="font-medium capitalize">{label || name}</div>
                  <div className="text-gray-400 text-xs">{shortcut}</div>
                </div>
              }
            >
              <button
                className={`
                  toolbar-button 
                  transition-all 
                  duration-200 
                  hover:bg-primary/10 
                  rounded 
                  p-2 
                  ${activeTool === name ? 'bg-primary/20' : ''}
                `}
                onClick={() => {
                  console.log('Toolbar button clicked:', name);
                  if (name === 'meme') {
                    setShowMemeSearch(true);
                  } else {
                    handleToolClick(name);
                  }
                }}
                aria-label={label || name}
              >
                <Icon className="w-5 h-5 text-primary" />
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Dynamic controls */}
        {getDynamicControls().length > 0 && (
          <div className="flex items-center justify-center gap-1 bg-secondary/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg ml-2">
            {getDynamicControls().map((control) => (
              <Tooltip key={control.id} content={control.label}>
                {control.type === 'slider' ? (
                  <div className="flex items-center gap-2 px-2">
                    <Minus className="w-4 h-4 text-primary" />
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={control.value as number}
                      onChange={(e) => {
                        // Handle slider change
                        console.log('Slider value:', e.target.value);
                      }}
                      className="w-24 h-1 accent-primary"
                    />
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                ) : control.type === 'color' ? (
                  <div className="relative">
                    <button
                      className="toolbar-button p-2 hover:bg-primary/10 rounded"
                      onClick={control.action}
                    >
                      <control.icon className="w-5 h-5 text-primary" />
                    </button>
                    <input
                      type="color"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        // Handle color change
                        console.log('Color value:', e.target.value);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    className="toolbar-button p-2 hover:bg-primary/10 rounded"
                    onClick={control.action}
                  >
                    <control.icon className="w-5 h-5 text-primary" />
                  </button>
                )}
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Right side tools */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        <LoginButton />
      </div>
    </div>
  );
};