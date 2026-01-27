'use client';

import React from 'react';

interface ClubCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ClubCard({ children, className = "", noPadding = false }: ClubCardProps) {
  return (
    <div className={`
      bg-[#fdfcf8]
      border-2 border-[#1e293b]
      shadow-[4px_4px_0px_0px_#1e293b]
      hover:shadow-[6px_6px_0px_0px_#ef4444]
      hover:-translate-y-0.5
      transition-all duration-200
      ${noPadding ? '' : 'p-6'}
      ${className}
    `}>
      {children}
    </div>
  );
}
