import { NextRequest, NextResponse } from 'next/server';
import { format, subDays, subWeeks, subMonths, subQuarters, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { getAggregatedMetrics, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly';

function getDateRange(period: Period): { startDate: string; endDate: string } {
  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;

  switch (period) {
    case 'daily':
      startDate = subDays(today, 7); // Last 7 days
      break;
    case 'weekly':
      startDate = startOfWeek(subWeeks(today, 4)); // Last 4 weeks
      endDate = endOfWeek(today);
      break;
    case 'monthly':
      startDate = startOfMonth(subMonths(today, 3)); // Last 3 months
      endDate = endOfMonth(today);
      break;
    case 'quarterly':
      startDate = startOfQuarter(subQuarters(today, 2)); // Last 2 quarters
      endDate = endOfQuarter(today);
      break;
    default:
      startDate = subDays(today, 7);
  }

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as Period) || 'daily';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    let startDate: string;
    let endDate: string;

    if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else {
      const range = getDateRange(period);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const metrics = await getAggregatedMetrics(startDate, endDate);

    return NextResponse.json({
      success: true,
      period,
      dateRange: { startDate, endDate },
      metrics,
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: String(error) },
      { status: 500 }
    );
  }
}
