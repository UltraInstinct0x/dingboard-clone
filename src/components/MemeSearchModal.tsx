import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface MemeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemeSearchModal({ isOpen, onClose }: MemeSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when modal opens
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-xl bg-[#1e1e2e] rounded-lg shadow-2xl overflow-hidden">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memes, manga, or templates..."
            className="w-full pl-12 pr-4 py-4 text-xl bg-[#181825] text-white border-b border-gray-700 focus:outline-none"
          />
        </div>

        {/* Search Results or Placeholder */}
        <div className="p-4 text-center text-gray-400">
          {searchQuery.length === 0 ? (
            <p>Start typing to search memes, manga, or templates</p>
          ) : (
            <p>No results found for "{searchQuery}"</p>
          )}
        </div>
      </div>
    </div>
  );
}
