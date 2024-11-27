// src/components/ContextMenu.tsx
import React from 'react';
import type { ContextMenuItem } from '../types';

type ContextMenuProps = {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
};

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const [prompt, setPrompt] = React.useState('');

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't close if clicking inside input
      if ((e.target as HTMLElement).closest('.prompt-input')) return;
      onClose();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Generate image from prompt:', prompt);
    // Add your LLM image generation logic here
    setPrompt('');
    onClose();
  };

  return (
    <div
      className="fixed bg-[#1e1e2e] rounded-lg shadow-lg py-1 min-w-[200px] z-50"
      style={{ top: y, left: x }}
    >
      <form onSubmit={handlePromptSubmit} className="px-4 py-2 border-b border-gray-700">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI..."
          className="prompt-input w-full bg-gray-800 text-white px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </form>
      
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className={`w-full px-4 py-2 text-left text-sm hover:bg-secondary flex justify-between items-center
            ${item.isDanger ? 'text-danger' : 'text-white'}`}
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="ml-4 text-gray-400 text-xs">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
}