import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getDailyMetrics } from '@/lib/instagram';
import { upsertInstagramMetrics, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

  try {
    await initDatabase();

    const results: Record<string, unknown> = {};
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      try {
        const metrics = await getDailyMetrics(date);
        await upsertInstagramMetrics(metrics);
        results[date] = {
          status: 'synced',
          followers: metrics.followers,
          reach: metrics.reach,
          impressions: metrics.impressions,
          accounts_engaged: metrics.accounts_engaged,
        };
      } catch (error) {
        console.error(`Instagram backfill error for ${date}:`, error);
        results[date] = { status: 'error', error: String(error) };
      }
    }

    return NextResponse.json({
      success: true,
      daysBackfilled: days,
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Instagram backfill error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', details: String(error) },
      { status: 500 }
    );
  }
}
