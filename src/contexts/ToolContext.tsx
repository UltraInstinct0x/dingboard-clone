import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ToolType } from '../types';

interface ToastState {
  message: string;
  actions: string[];
  isVisible: boolean;
}

interface ToolContextType {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showMemeSearch: boolean;
  setShowMemeSearch: (show: boolean) => void;
  toolStatus: string;
  setToolStatus: (status: string) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  toast: ToastState;
  setToast: (toast: ToastState) => void;
  selectedElements: string[];
  setSelectedElements: (elements: string[]) => void;
}

export const ToolContext = createContext<ToolContextType | null>(null);

export function useToolContext() {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useToolContext must be used within ToolProvider');
  }
  return context;
}

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [showSettings, setShowSettings] = useState(false);
  const [showMemeSearch, setShowMemeSearch] = useState(false);
  const [toolStatus, setToolStatus] = useState('');
  const [zoom, setZoom] = useState(1);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>({
    message: '',
    actions: [],
    isVisible: false
  });

  const value = useMemo(() => ({
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
    setToast,
    selectedElements,
    setSelectedElements
  }), [activeTool, showSettings, showMemeSearch, toolStatus, zoom, toast,selectedElements]);

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
}