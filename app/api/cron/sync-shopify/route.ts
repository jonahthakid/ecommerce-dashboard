import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getDailyMetrics } from '@/lib/shopify';
import { upsertShopifyMetrics, upsertTopProducts, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  // Also check for Vercel's cron header
  if (request.headers.get('x-vercel-cron') === '1') {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Initialize database tables if they don't exist
    await initDatabase();

    // Sync yesterday's data (to ensure complete day)
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');

    const results = [];

    for (const date of [yesterday, today]) {
      try {
        const metrics = await getDailyMetrics(date);

        await upsertShopifyMetrics({
          date: metrics.date,
          traffic: metrics.traffic,
          conversion_rate: metrics.conversion_rate,
          orders: metrics.orders,
          new_customer_orders: metrics.new_customer_orders,
          revenue: metrics.revenue,
        });

        await upsertTopProducts(date, metrics.topProducts);

        results.push({ date, status: 'synced', orders: metrics.orders });
      } catch (error) {
        console.error(`Failed to sync Shopify for ${date}:`, error);
        results.push({ date, status: 'error', error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Shopify sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
