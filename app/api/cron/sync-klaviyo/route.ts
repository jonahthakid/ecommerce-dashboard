import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getKlaviyoMetrics as fetchKlaviyoMetrics } from '@/lib/klaviyo';
import { upsertKlaviyoMetrics, initDatabase } from '@/lib/db';

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

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Fetch Klaviyo metrics for yesterday (complete day)
    const metrics = await fetchKlaviyoMetrics(yesterday, yesterday);

    // Store the metrics
    await upsertKlaviyoMetrics({
      date: yesterday,
      campaigns_sent: metrics.campaigns.total,
      emails_sent: metrics.campaigns.sent,
      emails_opened: metrics.campaigns.opened,
      emails_clicked: metrics.campaigns.clicked,
      open_rate: metrics.campaigns.openRate,
      click_rate: metrics.campaigns.clickRate,
      active_flows: metrics.flows.active,
      subscriber_count: metrics.subscribers,
    });

    return NextResponse.json({
      success: true,
      platform: 'klaviyo',
      synced: {
        date: yesterday,
        campaigns_sent: metrics.campaigns.total,
        emails_sent: metrics.campaigns.sent,
        open_rate: `${metrics.campaigns.openRate.toFixed(1)}%`,
        click_rate: `${metrics.campaigns.clickRate.toFixed(1)}%`,
        active_flows: metrics.flows.active,
        subscriber_count: metrics.subscribers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Klaviyo sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
