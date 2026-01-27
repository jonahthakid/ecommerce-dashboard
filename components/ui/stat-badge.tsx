'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatBadgeProps {
  change: string;
  isPositive: boolean;
}

export function StatBadge({ change, isPositive }: StatBadgeProps) {
  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wide border-2
      ${isPositive
        ? 'bg-[#1e293b] text-white border-[#1e293b]'
        : 'bg-[#fee2e2] text-[#ef4444] border-[#ef4444]'}
    `}>
      {isPositive ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
      {change}
    </span>
  );
}
