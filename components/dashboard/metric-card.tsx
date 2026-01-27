'use client';

import { ClubCard } from '@/components/ui/club-card';
import { StatBadge } from '@/components/ui/stat-badge';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  loading?: boolean;
  className?: string;
}

export function MetricCard({ title, value, subtitle, change, isPositive = true, loading, className }: MetricCardProps) {
  if (loading) {
    return (
      <div className={`bg-[#fdfcf8] border-2 border-[#1e293b] p-6 ${className}`}>
        <Skeleton className="h-4 w-24 mb-4 bg-[#1e293b]/10" />
        <Skeleton className="h-10 w-32 bg-[#1e293b]/10" />
      </div>
    );
  }

  return (
    <ClubCard className={`flex flex-col justify-between h-full relative overflow-hidden ${className}`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="font-sans text-lg text-[#1e293b] font-medium italic border-b-2 border-[#ef4444] inline-block pr-4">
          {title}
        </h3>
        {change && <StatBadge change={change} isPositive={isPositive} />}
      </div>
      <div className="relative z-10">
        <p className="text-4xl font-mono font-bold text-[#1e293b] tracking-tighter">{value}</p>
        {subtitle && (
          <p className="text-xs font-sans font-bold text-[#ef4444] mt-2 uppercase tracking-wider">{subtitle}</p>
        )}
      </div>
    </ClubCard>
  );
}
