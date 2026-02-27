import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getKlaviyoMetrics as fetchKlaviyoMetrics, getDailyUniqueSignups } from '@/lib/klaviyo';
import { upsertKlaviyoMetrics, upsertDailySignups, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

    // Sync daily signups for the last 7 days
    const signupResults: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      try {
        const signups = await getDailyUniqueSignups(date);
        await upsertDailySignups(date, signups);
        signupResults[date] = signups;
      } catch (e) {
        console.error(`Failed to sync signups for ${date}:`, e);
        signupResults[date] = 0;
      }
    }

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
        daily_signups: signupResults,
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
