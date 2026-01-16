'use client';

import { GlassCard } from '@/components/ui/glass-card';
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

export function TrendChart({ shopifyDaily, adsDaily, loading }: TrendChartProps) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'adspend'>('revenue');

  if (loading) {
    return (
      <GlassCard>
        <h3 className="text-xl font-bold text-white mb-4">Trends</h3>
        <Skeleton className="h-[300px] w-full bg-white/5" />
      </GlassCard>
    );
  }

  // Prepare revenue/orders chart data
  const revenueData = shopifyDaily
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      date: formatDate(day.date),
      revenue: Number(day.revenue),
      orders: day.orders,
    }));

  // Prepare ad spend chart data - aggregate by date
  const adSpendByDate: Record<string, Record<string, number>> = {};
  for (const ad of adsDaily) {
    if (!adSpendByDate[ad.date]) {
      adSpendByDate[ad.date] = { meta: 0, google: 0, tiktok: 0, snapchat: 0 };
    }
    adSpendByDate[ad.date][ad.platform] = Number(ad.spend);
  }

  const adSpendData = Object.entries(adSpendByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, platforms]) => ({
      date: formatDate(date),
      ...platforms,
      total: Object.values(platforms).reduce((sum, v) => sum + v, 0),
    }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-lg border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-xs mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {activeTab === 'revenue' && entry.name === 'Revenue'
                ? formatCurrency(entry.value)
                : activeTab === 'adspend'
                  ? formatCurrency(entry.value)
                  : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Trends</h3>
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'revenue'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => setActiveTab('adspend')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'adspend'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ad Spend
          </button>
        </div>
      </div>

      {activeTab === 'revenue' && (
        <>
          {revenueData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={formatCurrency}
                  fontSize={12}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  fontSize={12}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#22d3ee', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#22d3ee', stroke: 'rgba(34,211,238,0.3)', strokeWidth: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#a78bfa', stroke: 'rgba(167,139,250,0.3)', strokeWidth: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      )}

      {activeTab === 'adspend' && (
        <>
          {adSpendData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adSpendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  fontSize={12}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  name="Meta"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="google"
                  name="Google"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="tiktok"
                  name="TikTok"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="snapchat"
                  name="Snapchat"
                  stroke="#facc15"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#facc15', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </GlassCard>
  );
}
