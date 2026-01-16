'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { MetricCard } from './metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp } from 'lucide-react';

interface PlatformMetrics {
  platform: string;
  spend: number;
  roas: number;
}

interface AdSpendSectionProps {
  platforms: PlatformMetrics[];
  totalSpend: number;
  blendedRoas: number;
  loading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const platformNames: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
};

const platformColors: Record<string, { bg: string; border: string; text: string }> = {
  meta: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  google: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
  tiktok: { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-300' },
  snapchat: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
};

export function AdSpendSection({ platforms, totalSpend, blendedRoas, loading }: AdSpendSectionProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Ad Performance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 bg-white/5" />
          <Skeleton className="h-32 bg-white/5" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Ad Performance</h2>

      {/* Combined totals */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Total Ad Spend"
          value={formatCurrency(totalSpend)}
          subtitle="All platforms combined"
          icon={DollarSign}
        />
        <MetricCard
          title="Blended ROAS"
          value={`${blendedRoas.toFixed(2)}x`}
          subtitle="Revenue / Ad Spend"
          icon={TrendingUp}
        />
      </div>

      {/* Individual platforms */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['meta', 'google', 'tiktok', 'snapchat'].map((platformKey) => {
          const platform = platforms.find((p) => p.platform === platformKey);
          const colors = platformColors[platformKey];
          return (
            <GlassCard key={platformKey}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`} />
                <span className={`text-sm font-medium ${colors.text}`}>
                  {platformNames[platformKey]}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Spend</p>
                  <p className="text-2xl font-bold text-white">
                    {platform ? formatCurrency(platform.spend) : '$0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">ROAS</p>
                  <p className="text-lg font-semibold text-slate-300">
                    {platform ? `${platform.roas.toFixed(2)}x` : '0.00x'}
                  </p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
