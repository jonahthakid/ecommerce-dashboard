'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from './metric-card';
import { Skeleton } from '@/components/ui/skeleton';

interface PlatformMetrics {
  platform: string;
  spend: number;
  roas: number;
}

interface AdSpendSectionProps {
  platforms: PlatformMetrics[];
  totalSpend: number;
  blendedRoas: number;
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

const platformNames: Record<string, string> = {
  meta: 'Meta (Facebook/Instagram)',
  google: 'Google Ads',
  tiktok: 'TikTok Ads',
  snapchat: 'Snapchat Ads',
};

const platformColors: Record<string, string> = {
  meta: 'bg-blue-500',
  google: 'bg-red-500',
  tiktok: 'bg-black',
  snapchat: 'bg-yellow-400',
};

export function AdSpendSection({ platforms, totalSpend, blendedRoas, loading }: AdSpendSectionProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ad Performance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ad Performance</h2>

      {/* Combined totals */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Total Ad Spend"
          value={formatCurrency(totalSpend)}
          subtitle="All platforms combined"
        />
        <MetricCard
          title="Blended ROAS"
          value={`${blendedRoas.toFixed(2)}x`}
          subtitle="Revenue / Ad Spend"
        />
      </div>

      {/* Individual platforms */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['meta', 'google', 'tiktok', 'snapchat'].map((platformKey) => {
          const platform = platforms.find((p) => p.platform === platformKey);
          return (
            <Card key={platformKey}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className={`w-3 h-3 rounded-full ${platformColors[platformKey]} mr-2`} />
                <CardTitle className="text-sm font-medium">
                  {platformNames[platformKey]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Spend</p>
                    <p className="text-lg font-semibold">
                      {platform ? formatCurrency(platform.spend) : '$0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ROAS</p>
                    <p className="text-lg font-semibold">
                      {platform ? `${platform.roas.toFixed(2)}x` : '0.00x'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
