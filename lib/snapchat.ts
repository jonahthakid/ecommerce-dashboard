const SNAPCHAT_CLIENT_ID = process.env.SNAPCHAT_CLIENT_ID!;
const SNAPCHAT_CLIENT_SECRET = process.env.SNAPCHAT_CLIENT_SECRET!;
const SNAPCHAT_REFRESH_TOKEN = process.env.SNAPCHAT_REFRESH_TOKEN!;
const SNAPCHAT_AD_ACCOUNT_ID = process.env.SNAPCHAT_AD_ACCOUNT_ID!;

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 60s buffer)
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  const response = await fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SNAPCHAT_CLIENT_ID,
      client_secret: SNAPCHAT_CLIENT_SECRET,
      refresh_token: SNAPCHAT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Snapchat access token: ${response.status}`);
  }

  const data = await response.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedAccessToken.token;
}

interface SnapchatStatsResponse {
  request_status: string;
  timeseries_stats?: Array<{
    timeseries_stat: {
      timeseries: Array<{
        stats: {
          spend?: number;
        };
      }>;
    };
  }>;
  total_stats?: Array<{
    total_stat: {
      stats: {
        spend?: number;
        impressions?: number;
      };
    };
  }>;
}

async function snapchatFetch<T>(endpoint: string): Promise<T> {
  const accessToken = await getAccessToken();

  const response = await fetch(`https://adsapi.snapchat.com/v1/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Snapchat API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Helper to get timezone offset based on date (PST vs PDT)
function getTimezoneOffset(date: string): string {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();

  // Rough DST check for America/Los_Angeles
  // DST starts ~March 10, ends ~November 3
  if (month > 3 && month < 11) {
    return '-07:00'; // PDT
  } else if (month === 3 && day >= 10) {
    return '-07:00'; // PDT
  } else if (month === 11 && day < 3) {
    return '-07:00'; // PDT
  }
  return '-08:00'; // PST
}

export async function getDailyMetrics(date: string) {
  try {
    const offset = getTimezoneOffset(date);
    const startTime = `${date}T00:00:00.000${offset}`;

    // Calculate next day for end time
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() + 1);
    const nextDay = dateObj.toISOString().split('T')[0];
    const nextOffset = getTimezoneOffset(nextDay);
    const endTime = `${nextDay}T00:00:00.000${nextOffset}`;

    // Use TOTAL granularity which is more reliable
    const data = await snapchatFetch<SnapchatStatsResponse>(
      `adaccounts/${SNAPCHAT_AD_ACCOUNT_ID}/stats?granularity=TOTAL&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&fields=spend,impressions`
    );

    // Handle TOTAL response format
    if (data.total_stats && data.total_stats.length > 0) {
      const stats = data.total_stats[0].total_stat.stats;
      const spend = (stats.spend || 0) / 1_000_000;
      const paid_reach = stats.impressions || 0;
      return {
        date,
        platform: 'snapchat' as const,
        spend,
        roas: 0,
        paid_reach,
      };
    }

    return {
      date,
      platform: 'snapchat' as const,
      spend: 0,
      roas: 0,
      paid_reach: 0,
    };
  } catch (error) {
    console.error('Snapchat API error:', error);
    return {
      date,
      platform: 'snapchat' as const,
      spend: 0,
      roas: 0,
      paid_reach: 0,
    };
  }
}
// trigger deploy
