'use client';

import { MetricCard } from './metric-card';

interface InstagramMetrics {
  followers: number;
  reach: number;
  impressions: number;
  accounts_engaged: number;
  yoy?: {
    followers: number | null;
    reach: number | null;
    impressions: number | null;
    accounts_engaged: number | null;
  };
}

interface InstagramSectionProps {
  metrics: InstagramMetrics | null;
  loading: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatYoy(yoy: number | null | undefined): string | undefined {
  if (yoy == null) return undefined;
  const sign = yoy >= 0 ? '+' : '';
  return `${sign}${yoy.toFixed(1)}% YoY`;
}

export function InstagramSection({ metrics, loading }: InstagramSectionProps) {
  const yoy = metrics?.yoy;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-sans font-medium text-[#1e293b]">The Gram</h2>
        <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Instagram</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Followers"
          value={metrics ? formatNumber(metrics.followers) : '-'}
          subtitle="Current"
          change={formatYoy(yoy?.followers)}
          isPositive={yoy?.followers != null ? yoy.followers >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Organic Reach"
          value={metrics ? formatNumber(metrics.reach) : '-'}
          subtitle="This period"
          change={formatYoy(yoy?.reach)}
          isPositive={yoy?.reach != null ? yoy.reach >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Impressions"
          value={metrics ? formatNumber(metrics.impressions) : '-'}
          subtitle="This period"
          change={formatYoy(yoy?.impressions)}
          isPositive={yoy?.impressions != null ? yoy.impressions >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Engagement"
          value={metrics ? formatNumber(metrics.accounts_engaged) : '-'}
          subtitle="Accounts engaged"
          change={formatYoy(yoy?.accounts_engaged)}
          isPositive={yoy?.accounts_engaged != null ? yoy.accounts_engaged >= 0 : true}
          loading={loading}
        />
      </div>
    </div>
  );
}
