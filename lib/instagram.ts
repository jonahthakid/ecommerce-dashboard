const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;

interface IgInsightsResponse {
  data: Array<{
    name: string;
    period: string;
    values: Array<{ value: number; end_time: string }>;
  }>;
}

interface IgAccountResponse {
  followers_count: number;
  media_count: number;
  id: string;
}

async function igFetch<T>(endpoint: string): Promise<T> {
  const url = `https://graph.facebook.com/v19.0/${endpoint}`;
  const separator = endpoint.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}access_token=${META_ACCESS_TOKEN}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getAccountInfo() {
  const data = await igFetch<IgAccountResponse>(
    `${INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=followers_count,media_count`
  );
  return {
    followers: data.followers_count,
    media_count: data.media_count,
  };
}

export async function getAccountInsights(date: string) {
  const since = Math.floor(new Date(`${date}T00:00:00`).getTime() / 1000);
  const nextDay = new Date(`${date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const until = Math.floor(nextDay.getTime() / 1000);

  const data = await igFetch<IgInsightsResponse>(
    `${INSTAGRAM_BUSINESS_ACCOUNT_ID}/insights?metric=reach,impressions,accounts_engaged&period=day&since=${since}&until=${until}`
  );

  const metrics: Record<string, number> = {};
  for (const item of data.data) {
    metrics[item.name] = item.values[0]?.value ?? 0;
  }

  return {
    reach: metrics.reach ?? 0,
    impressions: metrics.impressions ?? 0,
    accounts_engaged: metrics.accounts_engaged ?? 0,
  };
}

export async function getDailyMetrics(date: string) {
  const [account, insights] = await Promise.all([
    getAccountInfo(),
    getAccountInsights(date),
  ]);

  return {
    date,
    followers: account.followers,
    reach: insights.reach,
    impressions: insights.impressions,
    accounts_engaged: insights.accounts_engaged,
  };
}
