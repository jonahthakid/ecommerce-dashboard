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
  total_stats: Array<{
    total_stat: {
      spend: number;
      total_purchases_value?: number;
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
    // Snapchat uses ISO timestamps
    const startTime = `${date}T00:00:00.000-00:00`;
    const endTime = `${date}T23:59:59.999-00:00`;

    const data = await snapchatFetch<SnapchatStatsResponse>(
      `adaccounts/${SNAPCHAT_AD_ACCOUNT_ID}/stats?granularity=DAY&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&fields=spend,total_purchases_value`
    );

    if (!data.total_stats || data.total_stats.length === 0) {
      return {
        date,
        platform: 'snapchat' as const,
        spend: 0,
        roas: 0,
      };
    }

    const stats = data.total_stats[0].total_stat;
    // Snapchat spend is in micros (millionths of currency)
    const spend = (stats.spend || 0) / 1_000_000;
    const purchaseValue = stats.total_purchases_value || 0;
    const roas = spend > 0 ? purchaseValue / spend : 0;

    return {
      date,
      platform: 'snapchat' as const,
      spend,
      roas,
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
