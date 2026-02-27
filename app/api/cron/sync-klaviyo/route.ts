import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getCampaigns, getFlows, getCampaignMetrics, getDailyUniqueSignups } from '@/lib/klaviyo';
import { upsertKlaviyoMetrics, upsertDailySignups, getKlaviyoMetrics as getDbKlaviyoMetrics, initDatabase } from '@/lib/db';

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

    // Fetch campaign and flow data (fast API calls)
    const [campaigns, flows, campaignMetrics] = await Promise.all([
      getCampaigns().catch(() => []),
      getFlows().catch(() => []),
      getCampaignMetrics(yesterday, yesterday).catch(() => ({ sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 })),
    ]);

    const sentCampaigns = campaigns.filter((c) => {
      if (!c.attributes.send_time) return false;
      const sendDate = c.attributes.send_time.split('T')[0];
      return sendDate === yesterday && c.attributes.status === 'Sent';
    });

    const activeFlows = flows.filter((f) => f.attributes.status === 'Live' && !f.attributes.archived);
    const openRate = campaignMetrics.sent > 0 ? (campaignMetrics.opened / campaignMetrics.sent) * 100 : 0;
    const clickRate = campaignMetrics.sent > 0 ? (campaignMetrics.clicked / campaignMetrics.sent) * 100 : 0;

    // Get last known subscriber count from DB instead of slow API pagination
    const existingMetrics = await getDbKlaviyoMetrics(
      format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      yesterday
    );
    const lastKnownCount = existingMetrics.length > 0
      ? existingMetrics[0].subscriber_count
      : 30556; // Fallback from initial backfill

    // Store the metrics
    await upsertKlaviyoMetrics({
      date: yesterday,
      campaigns_sent: sentCampaigns.length,
      emails_sent: campaignMetrics.sent,
      emails_opened: campaignMetrics.opened,
      emails_clicked: campaignMetrics.clicked,
      open_rate: openRate,
      click_rate: clickRate,
      active_flows: activeFlows.length,
      subscriber_count: lastKnownCount,
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
        campaigns_sent: sentCampaigns.length,
        emails_sent: campaignMetrics.sent,
        open_rate: `${openRate.toFixed(1)}%`,
        click_rate: `${clickRate.toFixed(1)}%`,
        active_flows: activeFlows.length,
        subscriber_count: lastKnownCount,
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
