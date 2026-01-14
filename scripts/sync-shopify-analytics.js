#!/usr/bin/env node
/**
 * Sync Shopify Analytics from GitHub Action
 * This script runs from GitHub's servers (not blocked by Shopify)
 * and writes directly to the Postgres database.
 */

const https = require('https');

const SHOPIFY_STORE_DOMAIN = 'sugarloafsocialclub.myshopify.com';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const POSTGRES_URL = process.env.POSTGRES_URL;

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

// Try to fetch traffic data from ShopifyQL
async function getTrafficForDate(accessToken, date) {
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
      console.log('Analytics API returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.errors || data.data?.shopifyqlQuery?.parseErrors?.length > 0) {
      console.log('ShopifyQL errors:', JSON.stringify(data.errors || data.data?.shopifyqlQuery?.parseErrors));
      return null;
    }

    const tableData = data.data?.shopifyqlQuery?.tableData;
    if (!tableData || !tableData.rowData || tableData.rowData.length === 0) {
      return null;
    }

    const row = tableData.rowData[0];
    const columns = tableData.columns;

    let sessions = 0;
    let visitors = 0;

    columns.forEach((col, index) => {
      if (col.name === 'total_sessions') {
        sessions = parseInt(row[index]) || 0;
      } else if (col.name === 'total_visitors') {
        visitors = parseInt(row[index]) || 0;
      }
    });

    console.log(`Got real analytics for ${date}: ${sessions} sessions, ${visitors} visitors`);
    return { sessions, visitors };
  } catch (error) {
    console.log('Error fetching analytics:', error.message);
    return null;
  }
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

// Calculate metrics for a date
async function getDailyMetrics(accessToken, date) {
  const [orders, products, trafficData] = await Promise.all([
    getOrdersForDate(accessToken, date),
    getProducts(accessToken),
    getTrafficForDate(accessToken, date),
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

  // Use real traffic if available, otherwise estimate
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
  const url = new URL(connectionString);
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
  console.log('Starting Shopify sync from GitHub Action...\n');

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error('Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET');
  }

  if (!POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }

  // Get fresh access token
  const accessToken = await getAccessToken();

  // Get today and yesterday's dates
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  console.log(`\nSyncing data for dates: ${dates.join(', ')}\n`);

  // Process each date
  for (const date of dates) {
    console.log(`\n--- Processing ${date} ---`);

    try {
      const metrics = await getDailyMetrics(accessToken, date);

      console.log(`Orders: ${metrics.orders}, Revenue: $${metrics.revenue.toFixed(2)}`);
      console.log(`Traffic: ${metrics.traffic}${metrics.has_real_traffic ? ' (real)' : ' (estimated)'}`);
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
