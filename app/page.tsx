'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DateRangeSelector, DateRange, getDefaultDateRange } from '@/components/dashboard/date-range-selector';
import { ShopifySection } from '@/components/dashboard/shopify-section';
import { AdSpendSection } from '@/components/dashboard/ad-spend-section';
import { TopProductsTable } from '@/components/dashboard/top-products-table';
import { TrendChart } from '@/components/dashboard/trend-chart';

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                E-Commerce Dashboard
              </h1>
              {lastUpdated && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <DateRangeSelector value={dateRange} onChange={setDateRange} />
              <Button onClick={fetchMetrics} disabled={loading} variant="outline">
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400 mb-8">
            <p className="font-medium">Error loading metrics</p>
            <p className="text-sm">{error}</p>
            <Button onClick={fetchMetrics} variant="outline" size="sm" className="mt-2">
              Try Again
            </Button>
          </div>
        ) : null}

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
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-gray-800 dark:border-gray-700 mt-8">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Data synced every 6 hours. Manual refresh available above.
          </p>
        </div>
      </footer>
    </div>
  );
}
