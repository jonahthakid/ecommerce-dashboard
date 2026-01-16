'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DateRangeSelector, DateRange, getDefaultDateRange } from '@/components/dashboard/date-range-selector';
import { ShopifySection } from '@/components/dashboard/shopify-section';
import { AdSpendSection } from '@/components/dashboard/ad-spend-section';
import { TopProductsTable } from '@/components/dashboard/top-products-table';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { RefreshCw } from 'lucide-react';

interface Metrics {
  shopify: {
    traffic: number;
    conversion_rate: number;
    orders: number;
    new_customer_orders: number;
    revenue: number;
    daily: Array<{
      date: string;
      traffic: number;
      orders: number;
      revenue: number;
    }>;
  };
  ads: {
    platforms: Array<{
      platform: string;
      spend: number;
      roas: number;
    }>;
    totalSpend: number;
    blendedRoas: number;
    daily: Array<{
      date: string;
      platform: string;
      spend: number;
      roas: number;
    }>;
  };
  topProducts: Array<{
    product_id: string;
    product_title: string;
    quantity_sold: number;
    inventory_remaining: number;
  }>;
}

interface ApiResponse {
  success: boolean;
  period: string;
  dateRange: { startDate: string; endDate: string };
  metrics: Metrics;
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/metrics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.success === false ? 'Failed to fetch metrics' : 'Unknown error');
      }

      setMetrics(data.metrics);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return null;
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-slate-200 selection:bg-cyan-500/30 pb-20">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-40 mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl opacity-40 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] opacity-30" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              {dateRange.label} &middot; {dateRange.startDate} - {dateRange.endDate}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs font-mono text-slate-500 hidden md:block">
                Synced {getTimeSinceUpdate()}
              </span>
            )}
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all font-medium text-sm flex items-center gap-2 group disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}
              />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="glass-card p-4 border-rose-500/30 bg-rose-500/10">
            <p className="font-medium text-rose-400">Error loading metrics</p>
            <p className="text-sm text-rose-300/70">{error}</p>
            <Button onClick={fetchMetrics} variant="outline" size="sm" className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {/* Shopify Metrics */}
          <ShopifySection
            metrics={metrics?.shopify || null}
            loading={loading}
          />

          {/* Ad Performance */}
          <AdSpendSection
            platforms={metrics?.ads.platforms || []}
            totalSpend={metrics?.ads.totalSpend || 0}
            blendedRoas={metrics?.ads.blendedRoas || 0}
            loading={loading}
          />

          {/* Charts and Tables */}
          <div className="grid gap-8 lg:grid-cols-2">
            <TrendChart
              shopifyDaily={metrics?.shopify.daily || []}
              adsDaily={metrics?.ads.daily || []}
              loading={loading}
            />
            <TopProductsTable
              products={metrics?.topProducts || []}
              loading={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-white/5">
          <p className="text-sm text-slate-500 text-center">
            Data synced every 6 hours via Vercel Cron. Manual refresh available above.
          </p>
        </footer>
      </div>
    </div>
  );
}
