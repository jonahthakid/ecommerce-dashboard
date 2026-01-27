import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getDailyMetrics as getSnapchatMetrics } from '@/lib/snapchat';
import { upsertAdMetrics, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
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

    const results: Array<{ date: string; status: string; spend?: number; roas?: number; error?: string }> = [];
    const today = new Date();

    for (let i = offset; i < offset + days; i++) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      try {
        const metrics = await getSnapchatMetrics(date);
        await upsertAdMetrics(metrics);
        results.push({ date, status: 'synced', spend: metrics.spend, roas: metrics.roas });
      } catch (error) {
        console.error(`Snapchat sync error for ${date}:`, error);
        results.push({ date, status: 'error', error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      platform: 'snapchat',
      daysBackfilled: days,
      offset,
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Snapchat backfill error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', details: String(error) },
      { status: 500 }
    );
  }
}
