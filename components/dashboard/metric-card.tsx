'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
  className?: string;
  icon?: LucideIcon;
}

export function MetricCard({ title, value, subtitle, loading, className, icon: Icon }: MetricCardProps) {
  if (loading) {
    return (
      <GlassCard className={className}>
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
        </div>
        <Skeleton className="h-4 w-24 mb-2 bg-white/5" />
        <Skeleton className="h-8 w-20 bg-white/5" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className={className}>
      {Icon && (
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-slate-300">
            <Icon size={20} />
          </div>
        </div>
      )}
      <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
        {title}
      </h3>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}
    </GlassCard>
  );
}
