import { NextRequest, NextResponse } from 'next/server';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { getDailyMetrics } from '@/lib/tiktok';
import { upsertAdMetrics, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

  try {
    await initDatabase();

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate') || '2025-01-01';
    const endDateParam = searchParams.get('endDate') || format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);
    const totalDays = differenceInDays(endDate, startDate) + 1;

    const results: Array<{ date: string; status: string; spend?: number; error?: string }> = [];
    const batchSize = 30; // Process 30 days at a time

    for (let i = offset; i < Math.min(offset + batchSize, totalDays); i++) {
      const date = format(subDays(endDate, totalDays - 1 - i), 'yyyy-MM-dd');

      try {
        const metrics = await getDailyMetrics(date);
        await upsertAdMetrics(metrics);
        results.push({ date, status: 'synced', spend: metrics.spend });
      } catch (error) {
        console.error(`Failed to sync TikTok for ${date}:`, error);
        results.push({ date, status: 'error', error: String(error) });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const nextOffset = offset + batchSize;
    const hasMore = nextOffset < totalDays;

    return NextResponse.json({
      success: true,
      platform: 'tiktok',
      synced: results,
      progress: {
        processed: Math.min(offset + batchSize, totalDays),
        total: totalDays,
        hasMore,
        nextUrl: hasMore
          ? `/api/backfill-tiktok?startDate=${startDateParam}&endDate=${endDateParam}&offset=${nextOffset}`
          : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TikTok backfill error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', details: String(error) },
      { status: 500 }
    );
  }
}
