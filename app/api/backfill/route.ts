import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getDailyMetrics as getShopifyMetrics } from '@/lib/shopify';
import { getDailyMetrics as getMetaMetrics } from '@/lib/meta';
import { getDailyMetrics as getGoogleMetrics } from '@/lib/google-ads';
import { getDailyMetrics as getTiktokMetrics } from '@/lib/tiktok';
import { getDailyMetrics as getSnapchatMetrics } from '@/lib/snapchat';
import { upsertShopifyMetrics, upsertTopProducts, upsertAdMetrics, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for backfill

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  if (request.headers.get('x-vercel-cron') === '1') {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  try {
    await initDatabase();

    const results: Record<string, unknown> = {};
    const today = new Date();

    // Generate list of dates to backfill (with offset for batching)
    const dates: string[] = [];
    for (let i = offset; i < offset + days; i++) {
      dates.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }

    // Sync Shopify for all dates
    for (const date of dates) {
      try {
        const metrics = await getShopifyMetrics(date);
        await upsertShopifyMetrics({
          date: metrics.date,
          traffic: metrics.traffic,
          conversion_rate: metrics.conversion_rate,
          orders: metrics.orders,
          new_customer_orders: metrics.new_customer_orders,
          revenue: metrics.revenue,
          contribution_margin: metrics.contribution_margin,
        });
        await upsertTopProducts(date, metrics.topProducts);
        results[`shopify_${date}`] = { status: 'synced', orders: metrics.orders };
      } catch (error) {
        console.error(`Shopify sync error for ${date}:`, error);
        results[`shopify_${date}`] = { status: 'error', error: String(error) };
      }
    }

    // Sync Ad Platforms for all dates
    const adPlatforms = [
      { name: 'meta', fn: getMetaMetrics },
      { name: 'google', fn: getGoogleMetrics },
      { name: 'tiktok', fn: getTiktokMetrics },
      { name: 'snapchat', fn: getSnapchatMetrics },
    ];

    for (const platform of adPlatforms) {
      for (const date of dates) {
        try {
          const metrics = await platform.fn(date);
          await upsertAdMetrics(metrics);
          results[`${platform.name}_${date}`] = { status: 'synced', spend: metrics.spend };
        } catch (error) {
          console.error(`${platform.name} sync error for ${date}:`, error);
          results[`${platform.name}_${date}`] = { status: 'error', error: String(error) };
        }
      }
    }

    return NextResponse.json({
      success: true,
      daysBackfilled: days,
      offset,
      dateRange: { from: dates[dates.length - 1], to: dates[0] },
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', details: String(error) },
      { status: 500 }
    );
  }
}
