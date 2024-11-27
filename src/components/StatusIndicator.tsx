import React from 'react';

type StatusIndicatorProps = {
  status: string;
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <div className="fixed bottom-4 left-4 bg-[#1e1e2e] rounded-lg px-4 py-2 text-sm text-gray-400">
      {status}
    </div>
  );
}