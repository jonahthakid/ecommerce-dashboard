'use client';

import { MetricCard } from './metric-card';

interface KlaviyoMetrics {
  subscriber_count: number;
  email_signups?: {
    total: number;
    daily: Array<{ date: string; signups: number }>;
    yoy: number | null;
  };
  subscriber_yoy?: number | null;
}

interface KlaviyoSectionProps {
  metrics: KlaviyoMetrics | null;
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

export function KlaviyoSection({ metrics, loading }: KlaviyoSectionProps) {
  const signupsYoy = metrics?.email_signups?.yoy;
  const subscriberYoy = metrics?.subscriber_yoy;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-sans font-medium text-[#1e293b]">Clubhouse</h2>
        <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Email</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <MetricCard
          title="New Signups"
          value={metrics?.email_signups ? formatNumber(metrics.email_signups.total) : '-'}
          subtitle="This period"
          change={formatYoy(signupsYoy)}
          isPositive={signupsYoy != null ? signupsYoy >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Total Subscribers"
          value={metrics ? formatNumber(metrics.subscriber_count) : '-'}
          subtitle="All time"
          change={formatYoy(subscriberYoy)}
          isPositive={subscriberYoy != null ? subscriberYoy >= 0 : true}
          loading={loading}
        />
      </div>
    </div>
  );
}
