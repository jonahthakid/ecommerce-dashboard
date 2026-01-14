const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID!;
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET!;
const GOOGLE_ADS_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN!;
const GOOGLE_ADS_CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID!;
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Google access token: ${response.status}`);
  }

  const data = await response.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedAccessToken.token;
}

async function googleAdsQuery(query: string): Promise<unknown[]> {
  const accessToken = await getAccessToken();
  const customerId = GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, '');

  const response = await fetch(
    `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Ads API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.flatMap((batch: { results?: unknown[] }) => batch.results || []);
}

export async function getDailyMetrics(date: string) {
  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.conversions_value
    FROM customer
    WHERE segments.date = '${date}'
  `;

  try {
    const results = await googleAdsQuery(query);

    if (results.length === 0) {
      return {
        date,
        platform: 'google' as const,
        spend: 0,
        roas: 0,
      };
    }

    // Aggregate results
    let totalSpend = 0;
    let totalConversionValue = 0;

    for (const row of results as Array<{
      metrics?: { cost_micros?: string; conversions_value?: number };
    }>) {
      if (row.metrics) {
        totalSpend += parseInt(row.metrics.cost_micros || '0') / 1_000_000;
        totalConversionValue += row.metrics.conversions_value || 0;
      }
    }

    const roas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    return {
      date,
      platform: 'google' as const,
      spend: totalSpend,
      roas,
    };
  } catch (error) {
    console.error('Google Ads API error:', error);
    return {
      date,
      platform: 'google' as const,
      spend: 0,
      roas: 0,
    };
  }
}
