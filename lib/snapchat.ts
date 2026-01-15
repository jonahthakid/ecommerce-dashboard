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

export async function getDailyMetrics(date: string) {
  try {
    // Snapchat requires times in account timezone (America/Los_Angeles = PST -08:00)
    const startTime = `${date}T00:00:00.000-08:00`;
    // Calculate next day for end time
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() + 1);
    const nextDay = dateObj.toISOString().split('T')[0];
    const endTime = `${nextDay}T00:00:00.000-08:00`;

    const data = await snapchatFetch<SnapchatStatsResponse>(
      `adaccounts/${SNAPCHAT_AD_ACCOUNT_ID}/stats?granularity=DAY&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&fields=spend`
    );

    if (!data.timeseries_stats || data.timeseries_stats.length === 0) {
      return {
        date,
        platform: 'snapchat' as const,
        spend: 0,
        roas: 0,
      };
    }

    const timeseries = data.timeseries_stats[0]?.timeseries_stat?.timeseries;
    if (!timeseries || timeseries.length === 0) {
      return {
        date,
        platform: 'snapchat' as const,
        spend: 0,
        roas: 0,
      };
    }

    // Snapchat spend is in micros (millionths of currency)
    const spend = (timeseries[0].stats.spend || 0) / 1_000_000;

    return {
      date,
      platform: 'snapchat' as const,
      spend,
      roas: 0, // ROAS not available at account level
    };
  } catch (error) {
    console.error('Snapchat API error:', error);
    return {
      date,
      platform: 'snapchat' as const,
      spend: 0,
      roas: 0,
    };
  }
}
// trigger deploy
