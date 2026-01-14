const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN!;
const TIKTOK_ADVERTISER_ID = process.env.TIKTOK_ADVERTISER_ID!;

interface TikTokReportResponse {
  code: number;
  message: string;
  data: {
    list: Array<{
      dimensions: {
        stat_time_day: string;
      };
      metrics: {
        spend: string;
        complete_payment_roas: string;
      };
    }>;
  };
}

async function tiktokFetch<T>(endpoint: string, body: object): Promise<T> {
  const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/${endpoint}`, {
    method: 'POST',
    headers: {
      'Access-Token': TIKTOK_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TikTok API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`TikTok API error: ${data.message}`);
  }

  return data;
}

export async function getDailyMetrics(date: string) {
  try {
    const data = await tiktokFetch<TikTokReportResponse>('report/integrated/get/', {
      advertiser_id: TIKTOK_ADVERTISER_ID,
      report_type: 'BASIC',
      dimensions: ['stat_time_day'],
      data_level: 'AUCTION_ADVERTISER',
      metrics: ['spend', 'complete_payment_roas'],
      start_date: date,
      end_date: date,
      page_size: 1,
    });

    if (!data.data.list || data.data.list.length === 0) {
      return {
        date,
        platform: 'tiktok' as const,
        spend: 0,
        roas: 0,
      };
    }

    const metrics = data.data.list[0].metrics;
    const spend = parseFloat(metrics.spend) || 0;
    const roas = parseFloat(metrics.complete_payment_roas) || 0;

    return {
      date,
      platform: 'tiktok' as const,
      spend,
      roas,
    };
  } catch (error) {
    console.error('TikTok API error:', error);
    return {
      date,
      platform: 'tiktok' as const,
      spend: 0,
      roas: 0,
    };
  }
}
