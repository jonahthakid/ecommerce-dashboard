const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';
const KLAVIYO_REVISION = '2024-10-15';

function getApiKey(): string {
  const key = process.env.KLAVIYO_API_KEY;
  if (!key) {
    throw new Error('KLAVIYO_API_KEY not configured');
  }
  return key;
}

interface KlaviyoRequestOptions {
  endpoint: string;
  params?: Record<string, string>;
}

async function klaviyoRequest<T>({ endpoint, params }: KlaviyoRequestOptions): Promise<T> {
  const apiKey = getApiKey();

  const url = new URL(`${KLAVIYO_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': KLAVIYO_REVISION,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Klaviyo API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Types
interface KlaviyoCampaign {
  type: string;
  id: string;
  attributes: {
    name: string;
    status: string;
    archived: boolean;
    channel: string;
    send_time: string | null;
    created_at: string;
    updated_at: string;
  };
}

interface KlaviyoFlow {
  type: string;
  id: string;
  attributes: {
    name: string;
    status: string;
    archived: boolean;
    created: string;
    updated: string;
    trigger_type: string;
  };
}

interface KlaviyoList {
  type: string;
  id: string;
  attributes: {
    name: string;
    created: string;
    updated: string;
  };
}

interface KlaviyoMetricAggregate {
  type: string;
  attributes: {
    dates: string[];
    data: Array<{
      dimensions: string[];
      measurements: Record<string, number[]>;
    }>;
  };
}

// Fetch all campaigns
export async function getCampaigns(): Promise<KlaviyoCampaign[]> {
  const campaigns: KlaviyoCampaign[] = [];
  let nextCursor: string | null = null;

  do {
    const params: Record<string, string> = {
      'filter': 'equals(messages.channel,"email")',
      'sort': '-send_time',
    };
    if (nextCursor) {
      params['page[cursor]'] = nextCursor;
    }

    const response = await klaviyoRequest<{
      data: KlaviyoCampaign[];
      links?: { next?: string };
    }>({
      endpoint: '/campaigns',
      params,
    });

    campaigns.push(...response.data);

    // Get next cursor from links
    if (response.links?.next) {
      const nextUrl = new URL(response.links.next);
      nextCursor = nextUrl.searchParams.get('page[cursor]');
    } else {
      nextCursor = null;
    }
  } while (nextCursor && campaigns.length < 100); // Limit to 100 campaigns

  return campaigns;
}

// Fetch all flows
export async function getFlows(): Promise<KlaviyoFlow[]> {
  const flows: KlaviyoFlow[] = [];
  let nextCursor: string | null = null;

  do {
    const params: Record<string, string> = {};
    if (nextCursor) {
      params['page[cursor]'] = nextCursor;
    }

    const response = await klaviyoRequest<{
      data: KlaviyoFlow[];
      links?: { next?: string };
    }>({
      endpoint: '/flows',
      params,
    });

    flows.push(...response.data);

    if (response.links?.next) {
      const nextUrl = new URL(response.links.next);
      nextCursor = nextUrl.searchParams.get('page[cursor]');
    } else {
      nextCursor = null;
    }
  } while (nextCursor && flows.length < 100);

  return flows;
}

// Fetch all lists with profile counts
export async function getLists(): Promise<Array<KlaviyoList & { profile_count: number }>> {
  const response = await klaviyoRequest<{ data: KlaviyoList[] }>({
    endpoint: '/lists',
  });

  // Get profile counts for each list
  const listsWithCounts = await Promise.all(
    response.data.map(async (list) => {
      try {
        const countResponse = await klaviyoRequest<{ data: { attributes: { count: number } } }>({
          endpoint: `/lists/${list.id}/relationships/profiles`,
          params: { 'page[size]': '1' },
        });
        // The count is in the meta, but we need to get it differently
        // Let's use the profiles endpoint with count
        const profilesResponse = await fetch(
          `${KLAVIYO_API_BASE}/lists/${list.id}/profiles?page[size]=1`,
          {
            headers: {
              'Authorization': `Klaviyo-API-Key ${getApiKey()}`,
              'revision': KLAVIYO_REVISION,
              'Accept': 'application/json',
            },
          }
        );
        const profilesData = await profilesResponse.json();
        return {
          ...list,
          profile_count: profilesData.meta?.page_info?.count || 0,
        };
      } catch {
        return { ...list, profile_count: 0 };
      }
    })
  );

  return listsWithCounts;
}

// Get campaign metrics for a date range
export async function getCampaignMetrics(startDate: string, endDate: string): Promise<{
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}> {
  // Query aggregate metrics for email campaigns
  const metrics = ['Received Email', 'Opened Email', 'Clicked Email', 'Bounced Email', 'Unsubscribed'];
  const results: Record<string, number> = {};

  for (const metricName of metrics) {
    try {
      const response = await fetch(`${KLAVIYO_API_BASE}/metric-aggregates`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${getApiKey()}`,
          'revision': KLAVIYO_REVISION,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: await getMetricIdByName(metricName),
              measurements: ['count'],
              interval: 'day',
              filter: [
                `greater-or-equal(datetime,${startDate}T00:00:00)`,
                `less-than(datetime,${endDate}T23:59:59)`,
              ],
              timezone: 'America/New_York',
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const counts = data.data?.attributes?.data?.[0]?.measurements?.count || [];
        results[metricName] = counts.reduce((sum: number, c: number) => sum + c, 0);
      }
    } catch (e) {
      console.error(`Failed to fetch ${metricName}:`, e);
      results[metricName] = 0;
    }
  }

  return {
    sent: results['Received Email'] || 0,
    opened: results['Opened Email'] || 0,
    clicked: results['Clicked Email'] || 0,
    bounced: results['Bounced Email'] || 0,
    unsubscribed: results['Unsubscribed'] || 0,
  };
}

// Get flow metrics for a date range
export async function getFlowMetrics(startDate: string, endDate: string): Promise<{
  sent: number;
  opened: number;
  clicked: number;
}> {
  // Flow metrics use same events but filtered by flow
  // For simplicity, we'll get all email metrics and separate campaign vs flow attribution is complex
  // Flows typically use "Received Email" with flow attribution
  const result = await getCampaignMetrics(startDate, endDate);

  return {
    sent: result.sent,
    opened: result.opened,
    clicked: result.clicked,
  };
}

// Helper to get metric ID by name
async function getMetricIdByName(name: string): Promise<string> {
  const response = await klaviyoRequest<{ data: Array<{ id: string; attributes: { name: string } }> }>({
    endpoint: '/metrics',
  });

  const metric = response.data.find((m) => m.attributes.name === name);
  if (!metric) {
    throw new Error(`Metric not found: ${name}`);
  }
  return metric.id;
}

// Get total subscriber count by counting all profiles in the account
export async function getSubscriberCount(): Promise<number> {
  try {
    let totalProfiles = 0;
    let nextCursor: string | null = null;

    do {
      const params: Record<string, string> = { 'page[size]': '100' };
      if (nextCursor) {
        params['page[cursor]'] = nextCursor;
      }

      const response = await klaviyoRequest<{
        data: Array<{ id: string }>;
        links?: { next?: string };
      }>({
        endpoint: '/profiles',
        params,
      });

      totalProfiles += response.data.length;

      if (response.links?.next) {
        const nextUrl = new URL(response.links.next);
        nextCursor = nextUrl.searchParams.get('page[cursor]');
      } else {
        nextCursor = null;
      }
    } while (nextCursor && totalProfiles < 100000); // Safety limit

    return totalProfiles;
  } catch (e) {
    console.error('Failed to get subscriber count:', e);
    return 0;
  }
}

// Get profiles that joined a specific list within a date range
export async function getListSignups(
  listId: string,
  startDate: string,
  endDate: string
): Promise<{ count: number; profileIds: string[] }> {
  const profileIds: string[] = [];
  let nextCursor: string | null = null;

  // Format dates as ISO 8601 for filtering
  const startISO = `${startDate}T00:00:00Z`;
  const endISO = `${endDate}T23:59:59Z`;

  do {
    const params: Record<string, string> = {
      'filter': `greater-or-equal(joined_group_at,${startISO}),less-than(joined_group_at,${endISO})`,
      'page[size]': '100',
      'fields[profile]': 'email',
    };
    if (nextCursor) {
      params['page[cursor]'] = nextCursor;
    }

    const response = await klaviyoRequest<{
      data: Array<{ id: string; attributes: { email: string } }>;
      links?: { next?: string };
    }>({
      endpoint: `/lists/${listId}/profiles`,
      params,
    });

    profileIds.push(...response.data.map((p) => p.id));

    if (response.links?.next) {
      const nextUrl = new URL(response.links.next);
      nextCursor = nextUrl.searchParams.get('page[cursor]');
    } else {
      nextCursor = null;
    }
  } while (nextCursor && profileIds.length < 10000); // Safety limit

  return { count: profileIds.length, profileIds };
}

// Get new profiles created on a specific date
export async function getDailyUniqueSignups(date: string): Promise<number> {
  try {
    // Klaviyo uses greater-than and less-than for date filtering
    const startISO = `${date}T00:00:00Z`;
    const endISO = `${date}T23:59:59Z`;

    let count = 0;
    let nextCursor: string | null = null;

    do {
      const params: Record<string, string> = {
        'filter': `greater-than(created,${startISO}),less-than(created,${endISO})`,
        'page[size]': '100',
      };
      if (nextCursor) {
        params['page[cursor]'] = nextCursor;
      }

      const response = await klaviyoRequest<{
        data: Array<{ id: string }>;
        links?: { next?: string };
      }>({
        endpoint: '/profiles',
        params,
      });

      count += response.data.length;

      if (response.links?.next) {
        const nextUrl = new URL(response.links.next);
        nextCursor = nextUrl.searchParams.get('page[cursor]');
      } else {
        nextCursor = null;
      }
    } while (nextCursor && count < 10000); // Safety limit

    return count;
  } catch (e) {
    console.error('Failed to get daily unique signups:', e);
    return 0;
  }
}

// Get new profiles created within a date range (more efficient for multi-day queries)
export async function getSignupsInRange(startDate: string, endDate: string): Promise<{
  total: number;
  byDate: Record<string, number>;
}> {
  try {
    const startISO = `${startDate}T00:00:00Z`;
    const endISO = `${endDate}T23:59:59Z`;

    const profiles: Array<{ created: string }> = [];
    let nextCursor: string | null = null;

    do {
      const params: Record<string, string> = {
        'filter': `greater-than(created,${startISO}),less-than(created,${endISO})`,
        'page[size]': '100',
        'fields[profile]': 'created',
      };
      if (nextCursor) {
        params['page[cursor]'] = nextCursor;
      }

      const response = await klaviyoRequest<{
        data: Array<{ id: string; attributes: { created: string } }>;
        links?: { next?: string };
      }>({
        endpoint: '/profiles',
        params,
      });

      profiles.push(...response.data.map((p) => ({ created: p.attributes.created })));

      if (response.links?.next) {
        const nextUrl = new URL(response.links.next);
        nextCursor = nextUrl.searchParams.get('page[cursor]');
      } else {
        nextCursor = null;
      }
    } while (nextCursor && profiles.length < 10000); // Safety limit

    // Group by date
    const byDate: Record<string, number> = {};
    for (const profile of profiles) {
      const date = profile.created.split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    }

    return {
      total: profiles.length,
      byDate,
    };
  } catch (e) {
    console.error('Failed to get signups in range:', e);
    return { total: 0, byDate: {} };
  }
}

// Get all Klaviyo metrics for dashboard
export async function getKlaviyoMetrics(startDate: string, endDate: string) {
  const [campaigns, flows, subscriberCount, campaignMetrics] = await Promise.all([
    getCampaigns().catch(() => []),
    getFlows().catch(() => []),
    getSubscriberCount().catch(() => 0),
    getCampaignMetrics(startDate, endDate).catch(() => ({ sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 })),
  ]);

  // Filter to sent campaigns in date range
  const sentCampaigns = campaigns.filter((c) => {
    if (!c.attributes.send_time) return false;
    const sendDate = c.attributes.send_time.split('T')[0];
    return sendDate >= startDate && sendDate <= endDate && c.attributes.status === 'Sent';
  });

  // Active flows
  const activeFlows = flows.filter((f) => f.attributes.status === 'Live' && !f.attributes.archived);

  const openRate = campaignMetrics.sent > 0 ? (campaignMetrics.opened / campaignMetrics.sent) * 100 : 0;
  const clickRate = campaignMetrics.sent > 0 ? (campaignMetrics.clicked / campaignMetrics.sent) * 100 : 0;

  return {
    campaigns: {
      total: sentCampaigns.length,
      sent: campaignMetrics.sent,
      opened: campaignMetrics.opened,
      clicked: campaignMetrics.clicked,
      openRate,
      clickRate,
    },
    flows: {
      active: activeFlows.length,
      total: flows.length,
    },
    subscribers: subscriberCount,
    lists: [],
  };
}
