'use client';

import { MetricCard } from './metric-card';

interface ShopifyYoy {
  revenue: number | null;
  contribution_margin: number | null;
  orders: number | null;
  new_customer_orders: number | null;
  traffic: number | null;
  conversion_rate: number | null;
}

interface ShopifyMetrics {
  traffic: number;
  conversion_rate: number;
  orders: number;
  new_customer_orders: number;
  revenue: number;
  contribution_margin: number;
  yoy?: ShopifyYoy;
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

function formatYoy(yoy: number | null | undefined): string | undefined {
  if (yoy == null) return undefined;
  const sign = yoy >= 0 ? '+' : '';
  return `${sign}${yoy.toFixed(1)}% YoY`;
}

export function ShopifySection({ metrics, loading }: ShopifySectionProps) {
  const yoy = metrics?.yoy;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-sans font-medium text-[#1e293b]">Pro Shop</h2>
        <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Store Performance</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Gross Revenue"
          value={metrics ? formatCurrency(metrics.revenue) : '-'}
          subtitle="Total Sales"
          change={formatYoy(yoy?.revenue)}
          isPositive={yoy?.revenue != null ? yoy.revenue >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Contribution Margin"
          value={metrics ? formatCurrency(metrics.contribution_margin || 0) : '-'}
          subtitle={metrics && metrics.revenue > 0 ? `${((metrics.contribution_margin / metrics.revenue) * 100).toFixed(1)}% margin` : 'Revenue - COGS'}
          change={formatYoy(yoy?.contribution_margin)}
          isPositive={yoy?.contribution_margin != null ? yoy.contribution_margin >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Orders"
          value={metrics ? formatNumber(metrics.orders) : '-'}
          subtitle="Completed"
          change={formatYoy(yoy?.orders)}
          isPositive={yoy?.orders != null ? yoy.orders >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="New Members"
          value={metrics ? formatNumber(metrics.new_customer_orders) : '-'}
          subtitle="First-time Buyers"
          change={formatYoy(yoy?.new_customer_orders)}
          isPositive={yoy?.new_customer_orders != null ? yoy.new_customer_orders >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Traffic"
          value={metrics ? formatNumber(metrics.traffic) : '-'}
          subtitle="Sessions"
          change={formatYoy(yoy?.traffic)}
          isPositive={yoy?.traffic != null ? yoy.traffic >= 0 : true}
          loading={loading}
        />
        <MetricCard
          title="Conversion"
          value={metrics ? `${metrics.conversion_rate.toFixed(2)}%` : '-'}
          subtitle="Visitors to Customers"
          change={formatYoy(yoy?.conversion_rate)}
          isPositive={yoy?.conversion_rate != null ? yoy.conversion_rate >= 0 : true}
          loading={loading}
        />
      </div>
    </div>
  );
}
