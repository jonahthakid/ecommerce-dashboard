'use client';

import { MetricCard } from './metric-card';

interface ShopifyMetrics {
  traffic: number;
  conversion_rate: number;
  orders: number;
  new_customer_orders: number;
  revenue: number;
  contribution_margin: number;
}

interface ShopifySectionProps {
  metrics: ShopifyMetrics | null;
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function ShopifySection({ metrics, loading }: ShopifySectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-sans font-medium italic text-[#1e293b]">Pro Shop</h2>
        <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Store Performance</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Gross Revenue"
          value={metrics ? formatCurrency(metrics.revenue) : '-'}
          subtitle="Total Sales"
          loading={loading}
        />
        <MetricCard
          title="Contribution Margin"
          value={metrics ? formatCurrency(metrics.contribution_margin || 0) : '-'}
          subtitle={metrics && metrics.revenue > 0 ? `${((metrics.contribution_margin / metrics.revenue) * 100).toFixed(1)}% margin` : 'Revenue - COGS'}
          loading={loading}
        />
        <MetricCard
          title="Orders"
          value={metrics ? formatNumber(metrics.orders) : '-'}
          subtitle="Completed"
          loading={loading}
        />
        <MetricCard
          title="New Members"
          value={metrics ? formatNumber(metrics.new_customer_orders) : '-'}
          subtitle="First-time Buyers"
          loading={loading}
        />
        <MetricCard
          title="Traffic"
          value={metrics ? formatNumber(metrics.traffic) : '-'}
          subtitle="Sessions"
          loading={loading}
        />
        <MetricCard
          title="Conversion"
          value={metrics ? `${metrics.conversion_rate.toFixed(2)}%` : '-'}
          subtitle="Visitors to Customers"
          loading={loading}
        />
      </div>
    </div>
  );
}
