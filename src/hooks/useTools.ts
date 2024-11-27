import { useCallback, useMemo, useEffect, useState } from 'react';
import { useToolContext } from '../contexts/ToolContext';
import type { ToolType, ToolInfo } from '../types';
import { 
  Type, 
  ImagePlus, 
  Pen, 
  Layout, 
  Camera, 
  Settings, 
  MousePointer 
} from 'lucide-react';

const getToolActions = (tool: ToolType) => {
  const actions: Record<ToolType, string[]> = {
    select: [
      'Shift: Add to selection',
      'Alt: Remove from selection',
      'Cmd + A: Select all',
      'Cmd + D: Duplicate selection'
    ],
    draw: [
      'Shift: Straight lines',
      'Alt: Smooth lines',
      'Cmd + Z: Undo last stroke',
      'Cmd + [: Decrease brush size',
      'Cmd + ]: Increase brush size'
    ],
    text: [
      'Shift + Enter: New line',
      'Cmd + B: Bold',
      'Cmd + I: Italic',
      'Cmd + U: Underline'
    ],
    import: [
      'Shift: Keep aspect ratio',
      'Alt: Center on canvas',
      'Cmd + R: Replace existing'
    ],
    meme: [
      'Shift: Equal spacing',
      'Alt: Center alignment',
      'Cmd + R: Reset layout'
    ],
    export: [
      'Shift: Include background',
      'Alt: Optimize size',
      'Cmd + E: Export as PNG'
    ],
    settings: [
      'Cmd + S: Save settings',
      'Cmd + R: Reset settings',
      'Esc: Close settings'
    ]
  };
  return actions[tool];
};

export function useTools() {
  const tools: ToolInfo[] = useMemo(() => [
    { 
      name: 'select', 
      label: 'Select', 
      shortcut: 'V', 
      icon: MousePointer, 
      status: 'Select mode', 
      description: 'Select and manipulate objects',
      modifierActions: {
        cmd: { 
          description: 'Select multiple objects', 
          icon: 'multiple-select.svg' 
        },
        shift: { 
          description: 'Add to current selection', 
          icon: 'add-selection.svg' 
        },
        alt: { 
          description: 'Deselect objects', 
          icon: 'deselect.svg' 
        }
      }
    },
    { 
      name: 'draw', 
      label: 'Draw', 
      shortcut: 'P', 
      icon: Pen, 
      status: 'Drawing mode', 
      description: 'Create and edit drawings',
      modifierActions: {
        cmd: { 
          description: 'Draw perfect shapes', 
          icon: 'perfect-shape.svg' 
        },
        shift: { 
          description: 'Constrain proportions', 
          icon: 'constrain.svg' 
        },
        alt: { 
          description: 'Draw from center', 
          icon: 'center-draw.svg' 
        }
      }
    },
    { 
      name: 'text', 
      label: 'Add Text', 
      shortcut: 'T', 
      icon: Type, 
      status: 'Adding text...', 
      description: 'Add and edit text',
      modifierActions: {
        cmd: { 
          description: 'Text formatting options', 
          icon: 'text-format.svg' 
        },
        shift: { 
          description: 'Align text', 
          icon: 'text-align.svg' 
        },
        alt: { 
          description: 'Text style variations', 
          icon: 'text-style.svg' 
        }
      }
    },
    { 
      name: 'import', 
      label: 'Import Images', 
      shortcut: 'I', 
      icon: ImagePlus, 
      status: 'Choose images...', 
      description: 'Import images from various sources',
      modifierActions: {
        cmd: { 
          description: 'Import from specific source', 
          icon: 'import-source.svg' 
        },
        shift: { 
          description: 'Batch import', 
          icon: 'batch-import.svg' 
        },
        alt: { 
          description: 'Import with filters', 
          icon: 'import-filter.svg' 
        }
      }
    },
    { 
      name: 'meme', 
      label: 'Meme & Manga', 
      shortcut: 'K', 
      icon: Layout, 
      status: 'Layout mode', 
      description: 'Create and edit memes and manga',
      modifierActions: {
        cmd: { 
          description: 'Meme template options', 
          icon: 'meme-template.svg' 
        },
        shift: { 
          description: 'Manga layout tools', 
          icon: 'manga-layout.svg' 
        },
        alt: { 
          description: 'Advanced composition', 
          icon: 'advanced-composition.svg' 
        }
      }
    },
    { 
      name: 'export', 
      label: 'Export Selection', 
      shortcut: 'S', 
      icon: Camera, 
      status: 'Export mode', 
      description: 'Export selected content',
      modifierActions: {
        cmd: { 
          description: 'Export with specific settings', 
          icon: 'export-settings.svg' 
        },
        shift: { 
          description: 'Export multiple items', 
          icon: 'export-multiple.svg' 
        },
        alt: { 
          description: 'Export with advanced options', 
          icon: 'export-advanced.svg' 
        }
      }
    },
    { 
      name: 'settings', 
      label: 'Settings', 
      shortcut: ',', 
      icon: Settings, 
      status: 'Settings', 
      description: 'Configure application settings',
      modifierActions: {
        cmd: { 
          description: 'Global application settings', 
          icon: 'global-settings.svg' 
        },
        shift: { 
          description: 'Tool-specific settings', 
          icon: 'tool-settings.svg' 
        },
        alt: { 
          description: 'Advanced configuration', 
          icon: 'advanced-settings.svg' 
        }
      }
    }
  ], []);

  const {
    activeTool,
    setActiveTool,
    showSettings,
    setShowSettings,
    showMemeSearch,
    setShowMemeSearch,
    toolStatus,
    setToolStatus,
    zoom,
    setZoom,
    toast,
    setToast
  } = useToolContext();

  const closeAllModals = useCallback(() => {
    setShowSettings(false);
    setShowMemeSearch(false);
  }, [setShowSettings, setShowMemeSearch]);

  const handleToolClick = useCallback((tool: ToolType) => {
    console.log('Tool clicked:', tool);
    setActiveTool(tool);

    // Close all modals first
    closeAllModals();
    const toolInfo = tools.find(t => t.name === tool);
    if (toolInfo) {
      setToolStatus(toolInfo.status);

      if (tool !== 'settings') {
        setToast({
          message: `${toolInfo.label} mode`,
          actions: getToolActions(tool),
          isVisible: true
        });
        if (tool !== 'meme') {
          setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
          }, 2000);
        }
       
      }
    }

    switch(tool) {
      case 'settings':
        setShowSettings(true);
        break;
      case 'meme':
        setShowMemeSearch(true);
        break;
    }
  }, [setActiveTool, setShowSettings, setShowMemeSearch, setToolStatus, setToast, tools]);

  const [modifierKeyToast, setModifierKeyToast] = useState<{
    visible: boolean;
    message: string;
    type: 'info' | 'warning' | 'success';
  }>({
    visible: false,
    message: '',
    type: 'info'
  });

  const handleCanvasZoom = useCallback((e: WheelEvent) => {
    // Check if cmd or ctrl is pressed
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault(); // Prevent default scroll

      // Determine zoom direction and amount
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      
      // You'll need to implement a global zoom state or pass this to your canvas context
      setZoom(Math.max(0.1, Math.min(zoom * zoomFactor, 5))); // Limit zoom between 0.1 and 5
    }
  }, [zoom]);

  const handleModifierKeyInteraction = useCallback((e: KeyboardEvent) => {
    const currentTool = tools.find(t => t.name === activeTool);

    if (!currentTool) return;

    // Cmd/Ctrl key interactions
    if (e.metaKey || e.ctrlKey) {
      // Canvas zoom event listener
      window.addEventListener('wheel', handleCanvasZoom, { passive: false });

      // Determine modifier key
      const modifierKey = e.metaKey ? 'cmd' : 'ctrl';
      const modifierInfo = currentTool.modifierActions?.[modifierKey];

      if (modifierInfo) {
        setModifierKeyToast({
          visible: true,
          message: modifierInfo.description,
          type: 'info'
        });
      }
    }

    // Shift key interactions
    if (e.shiftKey) {
      const modifierInfo = currentTool.modifierActions?.shift;
      if (modifierInfo) {
        setModifierKeyToast({
          visible: true,
          message: modifierInfo.description,
          type: 'warning'
        });
      }
    }

    // Alt key interactions
    if (e.altKey) {
      const modifierInfo = currentTool.modifierActions?.alt;
      if (modifierInfo) {
        setModifierKeyToast({
          visible: true,
          message: modifierInfo.description,
          type: 'success'
        });
      }
    }
  }, [activeTool, tools, handleCanvasZoom]);

  const handleModifierKeyRelease = useCallback((e: KeyboardEvent) => {
    // Remove canvas zoom listener
    window.removeEventListener('wheel', handleCanvasZoom);

    // Hide modifier key toast
    setModifierKeyToast({
      visible: false,
      message: '',
      type: 'info'
    });
  }, [handleCanvasZoom]);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Check if user is typing in an input or textarea
    const activeElement = document.activeElement;
    const isTyping = activeElement && 
      (activeElement.tagName === 'INPUT' || 
       activeElement.tagName === 'TEXTAREA' || 
       activeElement.contentEditable === 'true');

    // Restore modal closing for Escape
    if (e.key === 'Escape') {
      if (isTyping) {
        activeElement.blur();
      } else {
        closeAllModals();
        if (!showSettings && !showMemeSearch) {
          handleToolClick('select');
        }
      }
      return;
    }

    // Prevent further shortcuts if typing (except allowed keys)
    if (isTyping) {
      return;
    }

    // Existing shortcut logic remains the same
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleToolClick('meme');
        return;
      }

      const tool = tools.find(t => t.shortcut.toLowerCase().includes(e.key.toLowerCase()));
      if (tool) {
        e.preventDefault();
        handleToolClick(tool.name);
        return;
      }
    } else {
      // Single key shortcuts
      const tool = tools.find(t => 
        t.shortcut.length === 1 && 
        t.shortcut.toLowerCase() === e.key.toLowerCase()
      );
      if (tool) {
        e.preventDefault();
        handleToolClick(tool.name);
      }
    }
  };

  useEffect(() => {
    const combinedKeyHandler = (e: KeyboardEvent) => {
      // First, handle regular keyboard shortcuts
      handleKeyDown(e);
      
      // Then, handle modifier key interactions
      handleModifierKeyInteraction(e);
    };

    window.addEventListener('keydown', combinedKeyHandler);
    window.addEventListener('keydown', handleModifierKeyInteraction);
    window.addEventListener('keyup', handleModifierKeyRelease);

    return () => {
      window.removeEventListener('keydown', combinedKeyHandler);
      window.removeEventListener('keydown', handleModifierKeyInteraction);
      window.removeEventListener('keyup', handleModifierKeyRelease);
      window.removeEventListener('wheel', handleCanvasZoom);
    };
  }, [handleModifierKeyInteraction, handleModifierKeyRelease, handleCanvasZoom, handleKeyDown]);

  return {
    tools,
    activeTool,
    handleToolClick,
    showSettings,
    setShowSettings,
    showMemeSearch,
    setShowMemeSearch,
    toolStatus,
    zoom,
    toast,
    modifierKeyToast
  };
}
