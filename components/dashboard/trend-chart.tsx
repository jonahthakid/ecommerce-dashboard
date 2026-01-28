'use client';

import { ClubCard } from '@/components/ui/club-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

interface DailyShopifyMetric {
  date: string;
  traffic: number;
  orders: number;
  revenue: number;
}

interface DailyAdMetric {
  date: string;
  platform: string;
  spend: number;
  roas: number;
}

interface TrendChartProps {
  shopifyDaily: DailyShopifyMetric[];
  adsDaily: DailyAdMetric[];
  loading: boolean;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

const METRICS = {
  revenue: { label: 'Revenue', color: '#ef4444' },
  orders: { label: 'Orders', color: '#1e293b' },
  totalSpend: { label: 'Total Spend', color: '#059669' },
  meta: { label: 'Meta', color: '#3b82f6' },
  google: { label: 'Google', color: '#ea4335' },
  tiktok: { label: 'TikTok', color: '#64748b' },
  snapchat: { label: 'Snapchat', color: '#eab308' },
};

type MetricKey = keyof typeof METRICS;

export function TrendChart({ shopifyDaily, adsDaily, loading }: TrendChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set(['revenue', 'meta']));

  const toggleMetric = (metric: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <ClubCard>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-2xl font-sans font-medium text-[#1e293b]">Trends</h3>
          <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Performance</span>
        </div>
        <Skeleton className="h-[300px] w-full bg-[#1e293b]/10" />
      </ClubCard>
    );
  }

  // Aggregate ad spend by date
  const adSpendByDate: Record<string, Record<string, number>> = {};
  for (const ad of adsDaily) {
    if (!adSpendByDate[ad.date]) {
      adSpendByDate[ad.date] = { meta: 0, google: 0, tiktok: 0, snapchat: 0 };
    }
    adSpendByDate[ad.date][ad.platform] = Number(ad.spend);
  }

  // Combine all data by date
  const allDates = new Set<string>();
  shopifyDaily.forEach((d) => allDates.add(d.date));
  Object.keys(adSpendByDate).forEach((d) => allDates.add(d));

  const chartData = Array.from(allDates)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const shopify = shopifyDaily.find((d) => d.date === date);
      const ads = adSpendByDate[date] || { meta: 0, google: 0, tiktok: 0, snapchat: 0 };
      const totalSpend = ads.meta + ads.google + ads.tiktok + ads.snapchat;
      return {
        date: formatDate(date),
        revenue: shopify ? Number(shopify.revenue) : 0,
        orders: shopify ? shopify.orders : 0,
        totalSpend,
        ...ads,
      };
    });

  // Determine if we need dual Y-axis (orders vs currency metrics)
  const hasOrders = activeMetrics.has('orders');
  const hasCurrencyMetrics = Array.from(activeMetrics).some((m) => m !== 'orders');

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; dataKey: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#fdfcf8] border-2 border-[#1e293b] p-3 shadow-[4px_4px_0px_0px_#1e293b]">
          <p className="text-[#1e293b]/60 text-xs font-mono font-bold uppercase mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-mono font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'orders' ? entry.value : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ClubCard>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-sans font-medium text-[#1e293b]">Trends</h3>
          <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Performance</span>
        </div>

        {/* Metric toggles */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(METRICS) as MetricKey[]).map((key) => {
            const isActive = activeMetrics.has(key);
            const metric = METRICS[key];
            return (
              <button
                key={key}
                onClick={() => toggleMetric(key)}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#1e293b] text-white border-[#1e293b]'
                    : 'bg-[#fdfcf8] text-[#1e293b]/60 border-[#1e293b]/20 hover:border-[#1e293b]/40'
                }`}
              >
                <span
                  className="w-3 h-3 border-2 border-current"
                  style={{ backgroundColor: isActive ? metric.color : 'transparent' }}
                />
                {metric.label}
              </button>
            );
          })}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#1e293b]/60 font-mono uppercase text-sm">
          No data available
        </div>
      ) : activeMetrics.size === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#1e293b]/60 font-mono uppercase text-sm">
          Select metrics to display
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.1)" />
            <XAxis
              dataKey="date"
              fontSize={11}
              stroke="#1e293b"
              tickLine={false}
              axisLine={{ stroke: '#1e293b', strokeWidth: 2 }}
              fontFamily="monospace"
            />
            {hasCurrencyMetrics && (
              <YAxis
                yAxisId="currency"
                tickFormatter={formatCurrency}
                fontSize={11}
                stroke="#1e293b"
                tickLine={false}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }}
                fontFamily="monospace"
              />
            )}
            {hasOrders && (
              <YAxis
                yAxisId="orders"
                orientation={hasCurrencyMetrics ? 'right' : 'left'}
                fontSize={11}
                stroke="#1e293b"
                tickLine={false}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }}
                fontFamily="monospace"
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-[#1e293b] text-xs font-mono font-bold uppercase">{value}</span>}
            />

            {activeMetrics.has('revenue') && (
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={METRICS.revenue.color}
                strokeWidth={3}
                dot={{ r: 4, fill: METRICS.revenue.color, strokeWidth: 2, stroke: '#1e293b' }}
                activeDot={{ r: 6, fill: METRICS.revenue.color, stroke: '#1e293b', strokeWidth: 2 }}
              />
            )}
            {activeMetrics.has('orders') && (
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke={METRICS.orders.color}
                strokeWidth={3}
                dot={{ r: 4, fill: METRICS.orders.color, strokeWidth: 2, stroke: '#fdfcf8' }}
                activeDot={{ r: 6, fill: METRICS.orders.color, stroke: '#fdfcf8', strokeWidth: 2 }}
              />
            )}
            {activeMetrics.has('totalSpend') && (
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="totalSpend"
                name="Total Spend"
                stroke={METRICS.totalSpend.color}
                strokeWidth={3}
                dot={{ r: 4, fill: METRICS.totalSpend.color, strokeWidth: 2, stroke: '#1e293b' }}
                activeDot={{ r: 6, fill: METRICS.totalSpend.color, stroke: '#1e293b', strokeWidth: 2 }}
              />
            )}
            {activeMetrics.has('meta') && (
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="meta"
                name="Meta"
                stroke={METRICS.meta.color}
                strokeWidth={3}
                dot={{ r: 3, fill: METRICS.meta.color, stroke: '#1e293b', strokeWidth: 1 }}
              />
            )}
            {activeMetrics.has('google') && (
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="google"
                name="Google"
                stroke={METRICS.google.color}
                strokeWidth={3}
                dot={{ r: 3, fill: METRICS.google.color, stroke: '#1e293b', strokeWidth: 1 }}
              />
            )}
            {activeMetrics.has('tiktok') && (
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="tiktok"
                name="TikTok"
                stroke={METRICS.tiktok.color}
                strokeWidth={3}
                dot={{ r: 3, fill: METRICS.tiktok.color, stroke: '#fdfcf8', strokeWidth: 1 }}
              />
            )}
            {activeMetrics.has('snapchat') && (
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="snapchat"
                name="Snapchat"
                stroke={METRICS.snapchat.color}
                strokeWidth={3}
                dot={{ r: 3, fill: METRICS.snapchat.color, stroke: '#1e293b', strokeWidth: 1 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ClubCard>
  );
}
