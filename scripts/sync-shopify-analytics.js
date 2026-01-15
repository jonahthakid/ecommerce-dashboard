#!/usr/bin/env node
/**
 * Sync Shopify + GA4 Analytics from GitHub Action
 * - Shopify: orders, revenue, products, new customers
 * - GA4: traffic (sessions, visitors)
 */

const https = require('https');

const SHOPIFY_STORE_DOMAIN = 'sugarloafsocialclub.myshopify.com';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const POSTGRES_URL = process.env.POSTGRES_URL;
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const GA4_CREDENTIALS = process.env.GA4_CREDENTIALS;

// Simple fetch wrapper using https
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Get fresh Shopify access token using client credentials
async function getAccessToken() {
  console.log('Getting fresh Shopify access token...');

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('Got access token successfully');
  return data.access_token;
}

// Fetch orders for a specific date
async function getOrdersForDate(accessToken, date) {
  const startOfDay = `${date}T00:00:00-00:00`;
  const endOfDay = `${date}T23:59:59-00:00`;

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders.json?status=any&created_at_min=${startOfDay}&created_at_max=${endOfDay}&limit=250`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }

  const data = await response.json();
  return data.orders || [];
}

// Fetch products for inventory data
async function getProducts(accessToken) {
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/products.json?limit=250`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }

  const data = await response.json();
  return data.products || [];
}

// Fetch traffic from GA4
async function getGA4TrafficForDates(dates) {
  if (!GA4_PROPERTY_ID || !GA4_CREDENTIALS) {
    console.log('GA4 credentials not configured, will estimate traffic');
    return {};
  }

  console.log('Fetching traffic data from GA4...');

  try {
    const { BetaAnalyticsDataClient } = require('@google-analytics/data');
    const credentials = JSON.parse(GA4_CREDENTIALS);

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    });

    const startDate = dates[dates.length - 1]; // oldest
    const endDate = dates[0]; // newest

    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
    });

    const trafficByDate = {};

    if (response.rows) {
      for (const row of response.rows) {
        const dateStr = row.dimensionValues?.[0]?.value || '';
        // GA4 returns date as YYYYMMDD, convert to YYYY-MM-DD
        const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        trafficByDate[formattedDate] = {
          sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
          visitors: parseInt(row.metricValues?.[1]?.value || '0', 10),
        };
      }
    }

    console.log(`Got GA4 traffic for ${Object.keys(trafficByDate).length} days`);
    return trafficByDate;
  } catch (error) {
    console.error('Error fetching GA4 data:', error.message);
    return {};
  }
}

// Calculate metrics for a date
async function getDailyMetrics(accessToken, date, ga4Traffic) {
  const [orders, products] = await Promise.all([
    getOrdersForDate(accessToken, date),
    getProducts(accessToken),
  ]);

  const totalOrders = orders.length;
  const revenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);

  // Count new customer orders
  const newCustomerOrders = orders.filter((order) => {
    if (!order.customer) return false;
    if (order.customer.orders_count === 1) return true;
    if (order.customer.created_at) {
      const orderDate = order.created_at.split('T')[0];
      const customerDate = order.customer.created_at.split('T')[0];
      if (orderDate === customerDate) return true;
    }
    return false;
  }).length;

  // Calculate top products
  const productSales = {};
  for (const order of orders) {
    for (const item of order.line_items || []) {
      const key = String(item.product_id);
      if (!productSales[key]) {
        productSales[key] = { quantity: 0, title: item.title };
      }
      productSales[key].quantity += item.quantity;
    }
  }

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 10)
    .map(([productId, data]) => {
      const product = products.find((p) => String(p.id) === productId);
      const inventoryRemaining = product
        ? product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
        : 0;

      return {
        product_id: productId,
        product_title: data.title,
        quantity_sold: data.quantity,
        inventory_remaining: inventoryRemaining,
      };
    });

  // Use GA4 traffic if available, otherwise estimate from orders
  const trafficData = ga4Traffic[date];
  const traffic = trafficData?.sessions > 0
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
    has_real_traffic: trafficData?.sessions > 0,
  };
}

// Simple Postgres query function
async function pgQuery(connectionString, query, values = []) {
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(query, values);
    return result;
  } finally {
    await pool.end();
  }
}

// Main sync function
async function syncShopifyData() {
  console.log('Starting Shopify + GA4 sync from GitHub Action...\n');

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error('Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET');
  }

  if (!POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }

  // Get fresh access token
  const accessToken = await getAccessToken();

  // Get dates to sync (last 7 days)
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  console.log(`\nSyncing data for dates: ${dates.join(', ')}\n`);

  // Fetch GA4 traffic for all dates at once
  const ga4Traffic = await getGA4TrafficForDates(dates);

  // Process each date
  for (const date of dates) {
    console.log(`\n--- Processing ${date} ---`);

    try {
      const metrics = await getDailyMetrics(accessToken, date, ga4Traffic);

      console.log(`Orders: ${metrics.orders}, Revenue: $${metrics.revenue.toFixed(2)}`);
      console.log(`Traffic: ${metrics.traffic}${metrics.has_real_traffic ? ' (GA4)' : ' (estimated)'}`);
      console.log(`Conversion: ${metrics.conversion_rate.toFixed(2)}%`);
      console.log(`New customers: ${metrics.new_customer_orders}`);
      console.log(`Top products: ${metrics.topProducts.length}`);

      // Upsert to shopify_metrics table
      await pgQuery(POSTGRES_URL, `
        INSERT INTO shopify_metrics (date, traffic, conversion_rate, orders, new_customer_orders, revenue, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (date) DO UPDATE SET
          traffic = EXCLUDED.traffic,
          conversion_rate = EXCLUDED.conversion_rate,
          orders = EXCLUDED.orders,
          new_customer_orders = EXCLUDED.new_customer_orders,
          revenue = EXCLUDED.revenue,
          synced_at = NOW()
      `, [date, metrics.traffic, metrics.conversion_rate, metrics.orders, metrics.new_customer_orders, metrics.revenue]);

      // Delete old top products for this date and insert new ones
      await pgQuery(POSTGRES_URL, `DELETE FROM shopify_top_products WHERE date = $1`, [date]);

      for (const product of metrics.topProducts) {
        await pgQuery(POSTGRES_URL, `
          INSERT INTO shopify_top_products (date, product_id, product_title, quantity_sold, inventory_remaining, synced_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [date, product.product_id, product.product_title, product.quantity_sold, product.inventory_remaining]);
      }

      console.log(`✓ Saved metrics for ${date}`);
    } catch (error) {
      console.error(`Error processing ${date}:`, error.message);
    }
  }

  console.log('\n✓ Sync complete!');
  return accessToken; // Return token for updating Vercel env
}

// Run if called directly
syncShopifyData()
  .then((token) => {
    console.log('\nToken for Vercel update:', token.substring(0, 10) + '...');
    // Output token for GitHub Action to use
    const fs = require('fs');
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(outputFile, `token=${token}\n`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Sync failed:', error);
    process.exit(1);
  });
