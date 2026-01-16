'use client';

import { MetricCard } from './metric-card';
import { Users, TrendingUp, ShoppingCart, UserPlus, DollarSign } from 'lucide-react';

interface ShopifyMetrics {
  traffic: number;
  conversion_rate: number;
  orders: number;
  new_customer_orders: number;
  revenue: number;
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
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Store Performance</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Traffic"
          value={metrics ? formatNumber(metrics.traffic) : '-'}
          subtitle="Sessions"
          loading={loading}
          icon={Users}
        />
        <MetricCard
          title="Conversion Rate"
          value={metrics ? `${metrics.conversion_rate.toFixed(2)}%` : '-'}
          subtitle="Visitors to customers"
          loading={loading}
          icon={TrendingUp}
        />
        <MetricCard
          title="Orders"
          value={metrics ? formatNumber(metrics.orders) : '-'}
          subtitle="Total orders"
          loading={loading}
          icon={ShoppingCart}
        />
        <MetricCard
          title="New Customers"
          value={metrics ? formatNumber(metrics.new_customer_orders) : '-'}
          subtitle="First-time buyers"
          loading={loading}
          icon={UserPlus}
        />
        <MetricCard
          title="Revenue"
          value={metrics ? formatCurrency(metrics.revenue) : '-'}
          subtitle="Total revenue"
          loading={loading}
          icon={DollarSign}
        />
      </div>
    </div>
  );
}
