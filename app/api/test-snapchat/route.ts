import { NextRequest, NextResponse } from 'next/server';

const SNAPCHAT_CLIENT_ID = process.env.SNAPCHAT_CLIENT_ID!;
const SNAPCHAT_CLIENT_SECRET = process.env.SNAPCHAT_CLIENT_SECRET!;
const SNAPCHAT_REFRESH_TOKEN = process.env.SNAPCHAT_REFRESH_TOKEN!;
const SNAPCHAT_AD_ACCOUNT_ID = process.env.SNAPCHAT_AD_ACCOUNT_ID!;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Step 1: Get access token
    const tokenResponse = await fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SNAPCHAT_CLIENT_ID,
        client_secret: SNAPCHAT_CLIENT_SECRET,
        refresh_token: SNAPCHAT_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json({
        step: 'token',
        error: 'Failed to get access token',
        status: tokenResponse.status,
        response: tokenData,
      });
    }

    const accessToken = tokenData.access_token;

    // Query each month to find where spend is
    const months = [
      { name: 'Jan', start: '2025-01-01', end: '2025-02-01' },
      { name: 'Feb', start: '2025-02-01', end: '2025-03-01' },
      { name: 'Mar', start: '2025-03-01', end: '2025-04-01' },
      { name: 'Apr', start: '2025-04-01', end: '2025-05-01' },
      { name: 'May', start: '2025-05-01', end: '2025-06-01' },
      { name: 'Jun', start: '2025-06-01', end: '2025-07-01' },
      { name: 'Jul', start: '2025-07-01', end: '2025-08-01' },
      { name: 'Aug', start: '2025-08-01', end: '2025-09-01' },
      { name: 'Sep', start: '2025-09-01', end: '2025-10-01' },
      { name: 'Oct', start: '2025-10-01', end: '2025-11-01' },
      { name: 'Nov', start: '2025-11-01', end: '2025-12-01' },
      { name: 'Dec', start: '2025-12-01', end: '2026-01-01' },
    ];

    const monthlySpend: Record<string, number> = {};

    for (const month of months) {
      const url = `https://adsapi.snapchat.com/v1/adaccounts/${SNAPCHAT_AD_ACCOUNT_ID}/stats?granularity=TOTAL&start_time=${encodeURIComponent(month.start + 'T00:00:00.000-08:00')}&end_time=${encodeURIComponent(month.end + 'T00:00:00.000-08:00')}&fields=spend`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await resp.json();
      const spend = data.total_stats?.[0]?.total_stat?.stats?.spend || 0;
      monthlySpend[month.name] = spend / 1_000_000;
    }

    return NextResponse.json({
      success: true,
      adAccountId: SNAPCHAT_AD_ACCOUNT_ID,
      monthlySpend,
      totalSpend: Object.values(monthlySpend).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Exception',
      details: String(error),
    });
  }
}
