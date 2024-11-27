import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  actions?: string[];
  isVisible: boolean;
}

export function Toast({ message, actions, isVisible }: ToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-4 z-50 p-4 bg-[#1e1e2e] rounded-lg shadow-lg border border-[#313244]"
        >
          <div className="text-white text-sm">{message}</div>
          {actions && actions.length > 0 && (
            <div className="mt-2 space-y-1">
              {actions.map((action, index) => (
                <div key={index} className="text-sm text-gray-400">
                  {action}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
