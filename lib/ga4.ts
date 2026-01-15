import { BetaAnalyticsDataClient } from '@google-analytics/data';

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const GA4_CREDENTIALS = process.env.GA4_CREDENTIALS;

let client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (client) return client;

  if (!GA4_CREDENTIALS) {
    throw new Error('Missing GA4_CREDENTIALS environment variable');
  }

  const credentials = JSON.parse(GA4_CREDENTIALS);

  client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    projectId: credentials.project_id,
  });

  return client;
}

export async function getTrafficForDate(date: string): Promise<{ sessions: number; visitors: number }> {
  if (!GA4_PROPERTY_ID) {
    console.log('GA4_PROPERTY_ID not set, skipping GA4 fetch');
    return { sessions: 0, visitors: 0 };
  }

  try {
    const analyticsClient = getClient();

    const [response] = await analyticsClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: date, endDate: date }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
    });

    let sessions = 0;
    let visitors = 0;

    if (response.rows && response.rows.length > 0) {
      const row = response.rows[0];
      sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
      visitors = parseInt(row.metricValues?.[1]?.value || '0', 10);
    }

    return { sessions, visitors };
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    return { sessions: 0, visitors: 0 };
  }
}

export async function getTrafficForDateRange(
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; sessions: number; visitors: number }>> {
  if (!GA4_PROPERTY_ID) {
    return [];
  }

  try {
    const analyticsClient = getClient();

    const [response] = await analyticsClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: true }],
    });

    const results: Array<{ date: string; sessions: number; visitors: number }> = [];

    if (response.rows) {
      for (const row of response.rows) {
        const dateStr = row.dimensionValues?.[0]?.value || '';
        // GA4 returns date as YYYYMMDD, convert to YYYY-MM-DD
        const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

        results.push({
          date: formattedDate,
          sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
          visitors: parseInt(row.metricValues?.[1]?.value || '0', 10),
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching GA4 data range:', error);
    return [];
  }
}
