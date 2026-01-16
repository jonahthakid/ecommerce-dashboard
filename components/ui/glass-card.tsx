'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative group overflow-hidden',
        'bg-slate-900/40',
        'backdrop-blur-xl',
        'border border-white/10',
        'shadow-2xl shadow-black/50',
        'rounded-2xl p-6',
        'hover:border-white/20 transition-all duration-300',
        className
      )}
      {...props}
    >
      {/* Top gradient line for 3D effect */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      {children}
    </div>
  );
}
