const SNAPCHAT_ACCESS_TOKEN = process.env.SNAPCHAT_ACCESS_TOKEN!;
const SNAPCHAT_AD_ACCOUNT_ID = process.env.SNAPCHAT_AD_ACCOUNT_ID!;

interface SnapchatStatsResponse {
  total_stats: Array<{
    total_stat: {
      spend: number;
      total_purchases_value?: number;
    };
  }>;
}

async function snapchatFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`https://adsapi.snapchat.com/v1/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${SNAPCHAT_ACCESS_TOKEN}`,
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
