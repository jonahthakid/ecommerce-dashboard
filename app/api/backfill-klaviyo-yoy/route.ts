import { NextRequest, NextResponse } from 'next/server';
import { format, subDays, subYears } from 'date-fns';
import { getSignupsInRange, getSubscriberCount } from '@/lib/klaviyo';
import { upsertDailySignups, upsertKlaviyoMetrics, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initDatabase();

    // Backfill signups from one year ago (90-day window)
    const now = new Date();
    const endDate = subYears(subDays(now, 1), 1);
    const startDate = subDays(endDate, 89);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { total, byDate } = await getSignupsInRange(startStr, endStr);

    // Store each day's signups
    const stored: string[] = [];
    for (const [date, count] of Object.entries(byDate)) {
      await upsertDailySignups(date, count);
      stored.push(`${date}: ${count}`);
    }

    // Fill missing days with 0
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (!byDate[dateStr]) {
        await upsertDailySignups(dateStr, 0);
      }
      current.setDate(current.getDate() + 1);
    }

    // Also store a klaviyo_metrics row for subscriber_count snapshot
    // We use current subscriber count as a rough baseline for a year ago
    const subscriberCount = await getSubscriberCount();
    // Store a metric row for the middle of the YoY window so the query picks it up
    const midDate = format(subDays(endDate, 45), 'yyyy-MM-dd');
    await upsertKlaviyoMetrics({
      date: midDate,
      campaigns_sent: 0,
      emails_sent: 0,
      emails_opened: 0,
      emails_clicked: 0,
      open_rate: 0,
      click_rate: 0,
      active_flows: 0,
      subscriber_count: subscriberCount,
    });

    return NextResponse.json({
      success: true,
      range: { startDate: startStr, endDate: endStr },
      totalSignups: total,
      daysStored: stored.length,
      subscriberSnapshot: { date: midDate, count: subscriberCount },
    });
  } catch (error) {
    console.error('Backfill YoY error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', details: String(error) },
      { status: 500 }
    );
  }
}
