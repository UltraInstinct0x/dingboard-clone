import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModifierKeyToastProps {
  visible: boolean;
  message: string;
  type: 'info' | 'warning' | 'success';
}

export const ModifierKeyToast: React.FC<ModifierKeyToastProps> = ({ 
  visible, 
  message, 
  type 
}) => {
  const iconMap = {
    info: <Info className="w-6 h-6 text-blue-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
    success: <CheckCircle className="w-6 h-6 text-green-500" />
  };

  const bgColorMap = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
    success: 'bg-green-50 border-green-200'
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className={`
            fixed bottom-4 left-1/2 transform -translate-x-1/2 
            flex items-center space-x-3 
            px-4 py-2 
            border rounded-lg 
            shadow-lg 
            ${bgColorMap[type]}
            z-[100]
          `}
        >
          {iconMap[type]}
          <span className="text-sm font-medium text-gray-800">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
