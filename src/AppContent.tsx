import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Toolbar } from './components/Toolbar';
import  Canvas  from './canvas/Canvas';
import { MemeSearchModal } from './components/MemeSearchModal';
import { SettingsModal } from './components/SettingsModal';
import { ModifierKeyToast } from './components/ModifierKeyToast';
import { useTools } from './hooks/useTools';

export function AppContent() {
  const { 
    modifierKeyToast,
    showSettings,
    setShowSettings,
    showMemeSearch,
    setShowMemeSearch,
  } = useTools();

  return (
    <div className="app-container">
      <Toolbar />
      <Canvas />
      <MemeSearchModal 
        isOpen={showMemeSearch} 
        onClose={() => setShowMemeSearch(false)} 
      />
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#2c2c3a',
            color: '#ffffff',
          },
        }} 
      />
      <ModifierKeyToast 
        visible={modifierKeyToast.visible}
        message={modifierKeyToast.message}
        type={modifierKeyToast.type}
      />
    </div>
  );
}
