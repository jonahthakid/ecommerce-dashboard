'use client';

import { MetricCard } from './metric-card';

interface KlaviyoMetrics {
  campaigns_sent: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  open_rate: number;
  click_rate: number;
  active_flows: number;
  subscriber_count: number;
}

interface KlaviyoSectionProps {
  metrics: KlaviyoMetrics | null;
  loading: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function KlaviyoSection({ metrics, loading }: KlaviyoSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-sans font-medium italic text-[#1e293b]">Clubhouse</h2>
        <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Email & SMS</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Subscribers"
          value={metrics ? formatNumber(metrics.subscriber_count) : '-'}
          subtitle="Total List Size"
          loading={loading}
        />
        <MetricCard
          title="Emails Sent"
          value={metrics ? formatNumber(metrics.emails_sent) : '-'}
          subtitle={metrics ? `${metrics.campaigns_sent} campaigns` : 'Campaigns'}
          loading={loading}
        />
        <MetricCard
          title="Open Rate"
          value={metrics ? `${metrics.open_rate.toFixed(1)}%` : '-'}
          subtitle={metrics ? `${formatNumber(metrics.emails_opened)} opened` : 'Opened'}
          loading={loading}
        />
        <MetricCard
          title="Click Rate"
          value={metrics ? `${metrics.click_rate.toFixed(1)}%` : '-'}
          subtitle={metrics ? `${formatNumber(metrics.emails_clicked)} clicked` : 'Clicked'}
          loading={loading}
        />
      </div>
      {metrics && metrics.active_flows > 0 && (
        <div className="text-xs font-mono font-bold text-[#1e293b]/60 uppercase tracking-wider">
          {metrics.active_flows} active flows running
        </div>
      )}
    </div>
  );
}
