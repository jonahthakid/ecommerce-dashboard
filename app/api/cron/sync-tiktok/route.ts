import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getDailyMetrics } from '@/lib/tiktok';
import { upsertAdMetrics, initDatabase } from '@/lib/db';

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

    const results = [];

    for (const date of [yesterday, today]) {
      try {
        const metrics = await getDailyMetrics(date);
        await upsertAdMetrics(metrics);
        results.push({ date, status: 'synced', spend: metrics.spend, roas: metrics.roas });
      } catch (error) {
        console.error(`Failed to sync TikTok for ${date}:`, error);
        results.push({ date, status: 'error', error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      platform: 'tiktok',
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TikTok sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
