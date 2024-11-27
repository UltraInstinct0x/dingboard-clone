import React from 'react';

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
};

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="group relative">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block">
        <div className="bg-tooltip px-3 py-2 rounded shadow-lg text-sm whitespace-nowrap animate-fadeIn">
          {content}
        </div>
      </div>
    </div>
  );
}