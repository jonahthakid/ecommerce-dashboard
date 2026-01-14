import { sql } from '@vercel/postgres';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

// Token cache for client credentials flow
let tokenCache: { token: string; expiresAt: number } | null = null;
let oauthTokenCache: string | null = null;

async function getOAuthToken(): Promise<string | null> {
  if (oauthTokenCache) {
    return oauthTokenCache;
  }

  try {
    const result = await sql`
      SELECT access_token FROM shopify_tokens WHERE shop = ${SHOPIFY_STORE_DOMAIN}
    `;
    if (result.rows.length > 0) {
      oauthTokenCache = result.rows[0].access_token;
      return oauthTokenCache;
    }
  } catch {
    // Table might not exist yet
  }
  return null;
}

async function getAccessToken(): Promise<string> {
  // First, try to get OAuth token from database (has full analytics access)
  const oauthToken = await getOAuthToken();
  if (oauthToken) {
    return oauthToken;
  }

  // If a direct access token is provided, use it
  if (SHOPIFY_ACCESS_TOKEN) {
    return SHOPIFY_ACCESS_TOKEN;
  }

  // Otherwise use client credentials flow
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error('Missing Shopify credentials. Set SHOPIFY_ACCESS_TOKEN or SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.');
  }

  // Check if we have a valid cached token (with 5 min buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 300000) {
    return tokenCache.token;
  }

  // Get new token using client credentials grant
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; DashboardApp/1.0)',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Shopify access token: ${response.status} - ${error}`);
  }

  const data = await response.json();

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return tokenCache.token;
}

interface ShopifyOrder {
  id: string;
  created_at: string;
  total_price: string;
  customer: {
    id: string;
    orders_count?: number;
    created_at?: string;
  } | null;
  line_items: Array<{
    product_id: string;
    title: string;
    quantity: number;
  }>;
}

interface ShopifyProduct {
  id: string;
  title: string;
  variants: Array<{
    inventory_quantity: number;
  }>;
}

async function shopifyFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getOrdersForDate(date: string): Promise<ShopifyOrder[]> {
  const startOfDay = `${date}T00:00:00-00:00`;
  const endOfDay = `${date}T23:59:59-00:00`;

  const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
    `orders.json?status=any&created_at_min=${startOfDay}&created_at_max=${endOfDay}&limit=250`
  );

  return data.orders;
}

export async function getProducts(): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{ products: ShopifyProduct[] }>(
    'products.json?limit=250'
  );
  return data.products;
}

// Fetch real traffic data from Shopify Analytics using ShopifyQL
export async function getTrafficForDate(date: string): Promise<{ sessions: number; visitors: number }> {
  const accessToken = await getAccessToken();
  const query = `
    FROM sessions
    SHOW total_sessions, total_visitors
    WHERE session_date = '${date}'
    SINCE ${date}
    UNTIL ${date}
  `;

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              shopifyqlQuery(query: "${query.replace(/\n/g, ' ').replace(/"/g, '\\"')}") {
                tableData {
                  rowData
                  columns {
                    name
                    dataType
                  }
                }
                parseErrors {
                  message
                }
              }
            }
          `,
        }),
      }
    );

    if (!response.ok) {
      console.error('Analytics API error:', response.status);
      return { sessions: 0, visitors: 0 };
    }

    const data = await response.json();

    if (data.errors || data.data?.shopifyqlQuery?.parseErrors?.length > 0) {
      console.error('ShopifyQL errors:', data.errors || data.data?.shopifyqlQuery?.parseErrors);
      return { sessions: 0, visitors: 0 };
    }

    const tableData = data.data?.shopifyqlQuery?.tableData;
    if (!tableData || !tableData.rowData || tableData.rowData.length === 0) {
      return { sessions: 0, visitors: 0 };
    }

    // Parse the row data - format is usually [sessions, visitors]
    const row = tableData.rowData[0];
    const columns = tableData.columns;

    let sessions = 0;
    let visitors = 0;

    columns.forEach((col: { name: string }, index: number) => {
      if (col.name === 'total_sessions') {
        sessions = parseInt(row[index]) || 0;
      } else if (col.name === 'total_visitors') {
        visitors = parseInt(row[index]) || 0;
      }
    });

    return { sessions, visitors };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return { sessions: 0, visitors: 0 };
  }
}

export async function getDailyMetrics(date: string) {
  const [orders, products, trafficData] = await Promise.all([
    getOrdersForDate(date),
    getProducts(),
    getTrafficForDate(date),
  ]);

  // Calculate metrics
  const totalOrders = orders.length;
  const revenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
  // Count new customer orders - customer with orders_count of 1 or created same day as order
  const newCustomerOrders = orders.filter((order) => {
    if (!order.customer) return false;

    // If orders_count is 1, it's a new customer
    if (order.customer.orders_count === 1) return true;

    // If customer was created on the same day as the order, they're likely new
    if (order.customer.created_at) {
      const orderDate = order.created_at.split('T')[0];
      const customerDate = order.customer.created_at.split('T')[0];
      if (orderDate === customerDate) return true;
    }

    return false;
  }).length;

  // Calculate top products sold
  const productSales: Record<string, { quantity: number; title: string }> = {};
  for (const order of orders) {
    for (const item of order.line_items) {
      const key = item.product_id.toString();
      if (!productSales[key]) {
        productSales[key] = { quantity: 0, title: item.title };
      }
      productSales[key].quantity += item.quantity;
    }
  }

  // Sort by quantity and get top 10
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 10)
    .map(([productId, data]) => {
      const product = products.find((p) => p.id.toString() === productId);
      const inventoryRemaining = product
        ? product.variants.reduce((sum, v) => sum + v.inventory_quantity, 0)
        : 0;

      return {
        product_id: productId,
        product_title: data.title,
        quantity_sold: data.quantity,
        inventory_remaining: inventoryRemaining,
      };
    });

  // Use real traffic data from Shopify Analytics if available, otherwise estimate
  const traffic = trafficData.sessions > 0
    ? trafficData.sessions
    : (totalOrders > 0 ? Math.round(totalOrders / 0.02) : 0);

  const conversionRate = traffic > 0 ? (totalOrders / traffic) * 100 : 0;

  return {
    date,
    traffic,
    conversion_rate: conversionRate,
    orders: totalOrders,
    new_customer_orders: newCustomerOrders,
    revenue,
    topProducts,
  };
}
