import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getDailyMetrics as getShopifyMetrics } from '@/lib/shopify';
import { getDailyMetrics as getMetaMetrics } from '@/lib/meta';
import { getDailyMetrics as getGoogleMetrics } from '@/lib/google-ads';
import { getDailyMetrics as getTiktokMetrics } from '@/lib/tiktok';
import { getDailyMetrics as getSnapchatMetrics } from '@/lib/snapchat';
import { getKlaviyoMetrics as fetchKlaviyoMetrics } from '@/lib/klaviyo';
import { upsertShopifyMetrics, upsertTopProducts, upsertAdMetrics, upsertKlaviyoMetrics, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  try {
    await initDatabase();

    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    const results: Record<string, unknown> = {};

    // Sync Shopify
    for (const date of [yesterday, today]) {
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

    // Sync Ad Platforms
    const adPlatforms = [
      { name: 'meta', fn: getMetaMetrics },
      { name: 'google', fn: getGoogleMetrics },
      { name: 'tiktok', fn: getTiktokMetrics },
      { name: 'snapchat', fn: getSnapchatMetrics },
    ];

    for (const platform of adPlatforms) {
      for (const date of [yesterday, today]) {
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

    // Sync Klaviyo
    try {
      const klaviyoMetrics = await fetchKlaviyoMetrics(yesterday, yesterday);
      await upsertKlaviyoMetrics({
        date: yesterday,
        campaigns_sent: klaviyoMetrics.campaigns.total,
        emails_sent: klaviyoMetrics.campaigns.sent,
        emails_opened: klaviyoMetrics.campaigns.opened,
        emails_clicked: klaviyoMetrics.campaigns.clicked,
        open_rate: klaviyoMetrics.campaigns.openRate,
        click_rate: klaviyoMetrics.campaigns.clickRate,
        active_flows: klaviyoMetrics.flows.active,
        subscriber_count: klaviyoMetrics.subscribers,
      });
      results['klaviyo'] = {
        status: 'synced',
        emails_sent: klaviyoMetrics.campaigns.sent,
        subscriber_count: klaviyoMetrics.subscribers,
      };
    } catch (error) {
      console.error('Klaviyo sync error:', error);
      results['klaviyo'] = { status: 'error', error: String(error) };
    }

    return NextResponse.json({
      success: true,
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync all error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
