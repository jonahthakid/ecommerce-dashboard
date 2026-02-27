const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID!;

interface MetaInsightsResponse {
  data: Array<{
    date_start: string;
    date_stop: string;
    spend: string;
    reach?: string;
    purchase_roas?: Array<{ value: string }>;
    website_purchase_roas?: Array<{ value: string }>;
  }>;
}

async function metaFetch<T>(endpoint: string): Promise<T> {
  const url = `https://graph.facebook.com/v19.0/${endpoint}`;
  const separator = endpoint.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}access_token=${META_ACCESS_TOKEN}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meta API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getDailyMetrics(date: string) {
  const data = await metaFetch<MetaInsightsResponse>(
    `${META_AD_ACCOUNT_ID}/insights?fields=spend,reach,purchase_roas,website_purchase_roas&time_range={"since":"${date}","until":"${date}"}&level=account`
  );

  if (data.data.length === 0) {
    return {
      date,
      platform: 'meta' as const,
      spend: 0,
      roas: 0,
      paid_reach: 0,
    };
  }

  const insight = data.data[0];
  const spend = parseFloat(insight.spend) || 0;
  const paid_reach = parseInt(insight.reach || '0', 10) || 0;

  // ROAS can be in different fields depending on setup
  let roas = 0;
  if (insight.purchase_roas && insight.purchase_roas.length > 0) {
    roas = parseFloat(insight.purchase_roas[0].value) || 0;
  } else if (insight.website_purchase_roas && insight.website_purchase_roas.length > 0) {
    roas = parseFloat(insight.website_purchase_roas[0].value) || 0;
  }

  return {
    date,
    platform: 'meta' as const,
    spend,
    roas,
    paid_reach,
  };
}
