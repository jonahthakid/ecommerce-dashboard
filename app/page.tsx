'use client';

import { useState, useEffect, useCallback } from 'react';
import { DateRangeSelector, DateRange, getDefaultDateRange } from '@/components/dashboard/date-range-selector';
import { ShopifySection } from '@/components/dashboard/shopify-section';
import { AdSpendSection } from '@/components/dashboard/ad-spend-section';
import { TopProductsTable } from '@/components/dashboard/top-products-table';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { KlaviyoSection } from '@/components/dashboard/klaviyo-section';
import { RefreshCw, Trophy, Search, Menu } from 'lucide-react';

const ASSETS = {
  logoShield: "/assets/SSC-Big-S-Play-or-Perish-Color.png",
  arrowNavy: "/assets/SSC-Arrow-Navy.png"
};

interface Metrics {
  shopify: {
    traffic: number;
    conversion_rate: number;
    orders: number;
    new_customer_orders: number;
    revenue: number;
    contribution_margin: number;
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
      paid_reach: number;
    }>;
    totalSpend: number;
    totalReach: number;
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
  klaviyo: {
    campaigns_sent: number;
    emails_sent: number;
    emails_opened: number;
    emails_clicked: number;
    open_rate: number;
    click_rate: number;
    active_flows: number;
    subscriber_count: number;
    email_signups?: {
      total: number;
      daily: Array<{ date: string; signups: number }>;
      yoy: number | null;
    };
    subscriber_yoy?: number | null;
  };
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
    <div className="min-h-screen bg-[#f4f1ea] text-[#1e293b] font-sans selection:bg-[#ef4444] selection:text-white">

      {/* Nav Bar */}
      <nav className="bg-[#fdfcf8] border-b-2 border-[#1e293b] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">

          {/* Logo Brand Area */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 relative hover:scale-105 transition-transform duration-300">
              <img
                src={ASSETS.logoShield}
                alt="SSC Shield Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-sans font-bold uppercase tracking-widest leading-none text-[#1e293b]">
                Sugarloaf
              </h1>
              <span className="text-xs font-mono font-bold text-[#ef4444] tracking-[0.2em] uppercase">
                Play or Perish
              </span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            {lastUpdated && (
              <span className="font-mono text-xs font-bold text-[#1e293b]/40 uppercase">
                Synced {getTimeSinceUpdate()}
              </span>
            )}
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-6 py-2 bg-[#1e293b] text-white font-bold uppercase tracking-wider text-xs border-2 border-[#1e293b] hover:bg-[#ef4444] hover:border-[#ef4444] transition-all shadow-[4px_4px_0px_0px_#ef4444] hover:shadow-[2px_2px_0px_0px_#1e293b] disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <button className="md:hidden p-2 border-2 border-[#1e293b]">
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end border-b-2 border-[#1e293b] pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-[#ef4444]" size={20} />
              <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-widest">
                {dateRange.label}
              </span>
            </div>
            <h2 className="text-5xl font-sans font-bold uppercase text-[#1e293b] tracking-tight">
              Performance
            </h2>
          </div>

          {/* Decorative Arrow */}
          <div className="hidden md:block w-48 opacity-80 pb-2">
            <img src={ASSETS.arrowNavy} alt="Arrow" className="w-full" />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-[#fee2e2] border-2 border-[#ef4444] p-4 shadow-[4px_4px_0px_0px_#ef4444]">
            <p className="font-bold text-[#ef4444] uppercase">Error Loading Metrics</p>
            <p className="text-sm text-[#ef4444]/80">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-2 px-4 py-1 bg-[#ef4444] text-white font-bold text-xs uppercase border-2 border-[#ef4444] hover:bg-[#1e293b] hover:border-[#1e293b] transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Shopify Metrics */}
        <ShopifySection
          metrics={metrics?.shopify || null}
          loading={loading}
        />

        {/* Ad Performance */}
        <AdSpendSection
          platforms={metrics?.ads.platforms || []}
          totalSpend={metrics?.ads.totalSpend || 0}
          totalReach={metrics?.ads.totalReach || 0}
          blendedRoas={metrics?.ads.blendedRoas || 0}
          newCustomerOrders={metrics?.shopify.new_customer_orders || 0}
          loading={loading}
        />

        {/* Klaviyo Email */}
        <KlaviyoSection
          metrics={metrics?.klaviyo || null}
          loading={loading}
        />

        {/* Charts and Tables */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart
              shopifyDaily={metrics?.shopify.daily || []}
              adsDaily={metrics?.ads.daily || []}
              loading={loading}
            />
          </div>
          <TopProductsTable
            products={metrics?.topProducts || []}
            loading={loading}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#1e293b] bg-[#fdfcf8] mt-12 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={ASSETS.logoShield} className="w-8 h-8 opacity-80" alt="SSC" />
            <p className="font-sans text-[#1e293b]/60">&quot;Golf&apos;s Happiest Accident&quot;</p>
          </div>
          <p className="font-mono text-xs font-bold uppercase text-[#1e293b]/40">
            Data synced every 6 hours via Vercel Cron
          </p>
        </div>
      </footer>

    </div>
  );
}
