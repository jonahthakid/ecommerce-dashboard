import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getDailyMetrics } from '@/lib/instagram';
import { upsertInstagramMetrics, initDatabase } from '@/lib/db';

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

    for (const date of [yesterday, today]) {
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
        console.error(`Instagram sync error for ${date}:`, error);
        results[date] = { status: 'error', error: String(error) };
      }
    }

    return NextResponse.json({
      success: true,
      platform: 'instagram',
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Instagram sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
