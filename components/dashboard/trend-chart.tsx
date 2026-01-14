'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList>
            <TabsTrigger value="revenue">Revenue & Orders</TabsTrigger>
            <TabsTrigger value="adspend">Ad Spend</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            {revenueData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={formatCurrency}
                    fontSize={12}
                  />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip
                    formatter={(value, name) => {
                      const numValue = Number(value) || 0;
                      if (name === 'revenue') return [formatCurrency(numValue), 'Revenue'];
                      return [numValue, 'Orders'];
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="adspend" className="mt-4">
            {adSpendData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={adSpendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis tickFormatter={formatCurrency} fontSize={12} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="meta"
                    name="Meta"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="google"
                    name="Google"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="tiktok"
                    name="TikTok"
                    stroke="#000000"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="snapchat"
                    name="Snapchat"
                    stroke="#facc15"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
