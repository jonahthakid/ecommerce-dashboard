'use client';

import { ClubCard } from '@/components/ui/club-card';
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
  newCustomerOrders: number;
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
  meta: 'Meta',
  google: 'Google',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
};

const platformColors: Record<string, string> = {
  meta: 'bg-blue-500',
  google: 'bg-red-500',
  tiktok: 'bg-slate-700',
  snapchat: 'bg-yellow-500',
};

export function AdSpendSection({ platforms, totalSpend, blendedRoas, newCustomerOrders, loading }: AdSpendSectionProps) {
  const costPerNewCustomer = newCustomerOrders > 0 ? totalSpend / newCustomerOrders : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-sans font-medium text-[#1e293b]">Ad Performance</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#fdfcf8] border-2 border-[#1e293b] p-6">
              <Skeleton className="h-4 w-24 mb-4 bg-[#1e293b]/10" />
              <Skeleton className="h-10 w-32 bg-[#1e293b]/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-sans font-medium text-[#1e293b]">Scorecard</h2>
        <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Ad Performance</span>
      </div>

      {/* Combined totals */}
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          title="Total Ad Spend"
          value={formatCurrency(totalSpend)}
          subtitle="All Platforms"
        />
        <MetricCard
          title="Blended ROAS"
          value={`${blendedRoas.toFixed(2)}x`}
          subtitle="Revenue / Ad Spend"
        />
        <MetricCard
          title="Cost per New Customer"
          value={formatCurrency(costPerNewCustomer)}
          subtitle={`${newCustomerOrders} new customers`}
        />
      </div>

      {/* Individual platforms */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {['meta', 'google', 'tiktok', 'snapchat'].map((platformKey) => {
          const platform = platforms.find((p) => p.platform === platformKey);
          return (
            <ClubCard key={platformKey}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-3 h-3 ${platformColors[platformKey]} border-2 border-[#1e293b]`}></span>
                <span className="font-mono text-sm font-bold text-[#1e293b] uppercase">
                  {platformNames[platformKey]}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-mono font-bold text-[#1e293b]/60 uppercase tracking-wider">Spend</p>
                  <p className="text-2xl font-mono font-bold text-[#1e293b]">
                    {platform ? formatCurrency(platform.spend) : '$0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-[#1e293b]/60 uppercase tracking-wider">ROAS</p>
                  <p className="text-lg font-mono font-bold text-[#ef4444]">
                    {platform ? `${platform.roas.toFixed(2)}x` : '0.00x'}
                  </p>
                </div>
              </div>
            </ClubCard>
          );
        })}
      </div>
    </div>
  );
}
