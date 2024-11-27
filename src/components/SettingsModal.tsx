import React from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-lg p-6 bg-[#1e1e2e] rounded-lg shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4 text-white">Settings</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-200">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
              <div>⌘ + V</div><div>Select Tool</div>
              <div>⌘ + D</div><div>Draw Tool</div>
              <div>⌘ + T</div><div>Text Tool</div>
              <div>⌘ + I</div><div>Import Images</div>
              <div>⌘ + M</div><div>Meme & Manga</div>
              <div>⌘ + E</div><div>Export Selection</div>
              <div>⌘ + ,</div><div>Settings</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-200">Modifier Keys</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
              <div>Shift</div><div>Multi-select Mode</div>
              <div>Option/Alt</div><div>Precision Mode</div>
              <div>Ctrl</div><div>Snap to Grid</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-200">Theme</h3>
            <select className="w-full px-3 py-2 bg-[#181825] text-white rounded border border-gray-700">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-200">Canvas Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox" />
                <span className="text-sm text-gray-400">Show Grid</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox" />
                <span className="text-sm text-gray-400">Auto-save</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
