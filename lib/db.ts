import { sql } from '@vercel/postgres';

export interface ShopifyMetrics {
  id: number;
  date: string;
  traffic: number;
  conversion_rate: number;
  orders: number;
  new_customer_orders: number;
  revenue: number;
  synced_at: string;
}

export interface TopProduct {
  id: number;
  date: string;
  product_id: string;
  product_title: string;
  quantity_sold: number;
  inventory_remaining: number;
  synced_at: string;
}

export interface AdMetrics {
  id: number;
  date: string;
  platform: 'meta' | 'google' | 'tiktok' | 'snapchat';
  spend: number;
  roas: number;
  synced_at: string;
}

export interface KlaviyoMetrics {
  id: number;
  date: string;
  campaigns_sent: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  open_rate: number;
  click_rate: number;
  active_flows: number;
  subscriber_count: number;
  synced_at: string;
}

// Initialize database tables
export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS shopify_metrics (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      traffic INTEGER DEFAULT 0,
      conversion_rate DECIMAL(5,2) DEFAULT 0,
      orders INTEGER DEFAULT 0,
      new_customer_orders INTEGER DEFAULT 0,
      revenue DECIMAL(12,2) DEFAULT 0,
      synced_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopify_top_products (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      product_id VARCHAR(255),
      product_title VARCHAR(500),
      quantity_sold INTEGER DEFAULT 0,
      inventory_remaining INTEGER DEFAULT 0,
      synced_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ad_metrics (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      platform VARCHAR(50) NOT NULL,
      spend DECIMAL(12,2) DEFAULT 0,
      roas DECIMAL(8,2) DEFAULT 0,
      synced_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(date, platform)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS klaviyo_metrics (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      campaigns_sent INTEGER DEFAULT 0,
      emails_sent INTEGER DEFAULT 0,
      emails_opened INTEGER DEFAULT 0,
      emails_clicked INTEGER DEFAULT 0,
      open_rate DECIMAL(5,2) DEFAULT 0,
      click_rate DECIMAL(5,2) DEFAULT 0,
      active_flows INTEGER DEFAULT 0,
      subscriber_count INTEGER DEFAULT 0,
      synced_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Shopify metrics
export async function upsertShopifyMetrics(data: Omit<ShopifyMetrics, 'id' | 'synced_at'>) {
  return sql`
    INSERT INTO shopify_metrics (date, traffic, conversion_rate, orders, new_customer_orders, revenue)
    VALUES (${data.date}, ${data.traffic}, ${data.conversion_rate}, ${data.orders}, ${data.new_customer_orders}, ${data.revenue})
    ON CONFLICT (date) DO UPDATE SET
      traffic = EXCLUDED.traffic,
      conversion_rate = EXCLUDED.conversion_rate,
      orders = EXCLUDED.orders,
      new_customer_orders = EXCLUDED.new_customer_orders,
      revenue = EXCLUDED.revenue,
      synced_at = NOW()
  `;
}

export async function getShopifyMetrics(startDate: string, endDate: string) {
  const result = await sql<ShopifyMetrics>`
    SELECT * FROM shopify_metrics
    WHERE date >= ${startDate} AND date <= ${endDate}
    ORDER BY date DESC
  `;
  return result.rows;
}

// Top products
export async function upsertTopProducts(date: string, products: Array<Omit<TopProduct, 'id' | 'date' | 'synced_at'>>) {
  // Delete existing products for the date
  await sql`DELETE FROM shopify_top_products WHERE date = ${date}`;

  // Insert new products
  for (const product of products) {
    await sql`
      INSERT INTO shopify_top_products (date, product_id, product_title, quantity_sold, inventory_remaining)
      VALUES (${date}, ${product.product_id}, ${product.product_title}, ${product.quantity_sold}, ${product.inventory_remaining})
    `;
  }
}

export async function getTopProducts(date: string) {
  const result = await sql<TopProduct>`
    SELECT * FROM shopify_top_products
    WHERE date = ${date}
    ORDER BY quantity_sold DESC
    LIMIT 10
  `;
  return result.rows;
}

// Ad metrics
export async function upsertAdMetrics(data: Omit<AdMetrics, 'id' | 'synced_at'>) {
  return sql`
    INSERT INTO ad_metrics (date, platform, spend, roas)
    VALUES (${data.date}, ${data.platform}, ${data.spend}, ${data.roas})
    ON CONFLICT (date, platform) DO UPDATE SET
      spend = EXCLUDED.spend,
      roas = EXCLUDED.roas,
      synced_at = NOW()
  `;
}

export async function getAdMetrics(startDate: string, endDate: string) {
  const result = await sql<AdMetrics>`
    SELECT * FROM ad_metrics
    WHERE date >= ${startDate} AND date <= ${endDate}
    ORDER BY date DESC, platform
  `;
  return result.rows;
}

// Klaviyo metrics
export async function upsertKlaviyoMetrics(data: Omit<KlaviyoMetrics, 'id' | 'synced_at'>) {
  return sql`
    INSERT INTO klaviyo_metrics (date, campaigns_sent, emails_sent, emails_opened, emails_clicked, open_rate, click_rate, active_flows, subscriber_count)
    VALUES (${data.date}, ${data.campaigns_sent}, ${data.emails_sent}, ${data.emails_opened}, ${data.emails_clicked}, ${data.open_rate}, ${data.click_rate}, ${data.active_flows}, ${data.subscriber_count})
    ON CONFLICT (date) DO UPDATE SET
      campaigns_sent = EXCLUDED.campaigns_sent,
      emails_sent = EXCLUDED.emails_sent,
      emails_opened = EXCLUDED.emails_opened,
      emails_clicked = EXCLUDED.emails_clicked,
      open_rate = EXCLUDED.open_rate,
      click_rate = EXCLUDED.click_rate,
      active_flows = EXCLUDED.active_flows,
      subscriber_count = EXCLUDED.subscriber_count,
      synced_at = NOW()
  `;
}

export async function getKlaviyoMetrics(startDate: string, endDate: string) {
  const result = await sql<KlaviyoMetrics>`
    SELECT * FROM klaviyo_metrics
    WHERE date >= ${startDate} AND date <= ${endDate}
    ORDER BY date DESC
  `;
  return result.rows;
}

// Aggregated queries
export async function getAggregatedMetrics(startDate: string, endDate: string) {
  const [shopify, ads, topProducts, klaviyo] = await Promise.all([
    getShopifyMetrics(startDate, endDate),
    getAdMetrics(startDate, endDate),
    getTopProducts(endDate), // Get top products for the most recent date
    getKlaviyoMetrics(startDate, endDate),
  ]);

  // Calculate totals
  const shopifyTotals = shopify.reduce(
    (acc, day) => ({
      traffic: acc.traffic + day.traffic,
      orders: acc.orders + day.orders,
      new_customer_orders: acc.new_customer_orders + day.new_customer_orders,
      revenue: acc.revenue + Number(day.revenue),
    }),
    { traffic: 0, orders: 0, new_customer_orders: 0, revenue: 0 }
  );

  const avgConversionRate = shopify.length > 0
    ? shopify.reduce((sum, day) => sum + Number(day.conversion_rate), 0) / shopify.length
    : 0;

  // Group ad metrics by platform
  const adsByPlatform = ads.reduce((acc, ad) => {
    if (!acc[ad.platform]) {
      acc[ad.platform] = { spend: 0, roas: 0, count: 0 };
    }
    acc[ad.platform].spend += Number(ad.spend);
    acc[ad.platform].roas += Number(ad.roas);
    acc[ad.platform].count += 1;
    return acc;
  }, {} as Record<string, { spend: number; roas: number; count: number }>);

  // Calculate average ROAS per platform
  const adSummary = Object.entries(adsByPlatform).map(([platform, data]) => ({
    platform,
    spend: data.spend,
    roas: data.count > 0 ? data.roas / data.count : 0,
  }));

  const totalAdSpend = adSummary.reduce((sum, p) => sum + p.spend, 0);
  const totalRevenue = shopifyTotals.revenue;
  const blendedRoas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;

  // Klaviyo totals
  const klaviyoTotals = klaviyo.reduce(
    (acc, day) => ({
      campaigns_sent: acc.campaigns_sent + day.campaigns_sent,
      emails_sent: acc.emails_sent + day.emails_sent,
      emails_opened: acc.emails_opened + day.emails_opened,
      emails_clicked: acc.emails_clicked + day.emails_clicked,
    }),
    { campaigns_sent: 0, emails_sent: 0, emails_opened: 0, emails_clicked: 0 }
  );

  const latestKlaviyo = klaviyo[0]; // Most recent day for current counts

  return {
    shopify: {
      ...shopifyTotals,
      conversion_rate: avgConversionRate,
      daily: shopify,
    },
    ads: {
      platforms: adSummary,
      totalSpend: totalAdSpend,
      blendedRoas,
      daily: ads,
    },
    topProducts,
    klaviyo: {
      campaigns_sent: klaviyoTotals.campaigns_sent,
      emails_sent: klaviyoTotals.emails_sent,
      emails_opened: klaviyoTotals.emails_opened,
      emails_clicked: klaviyoTotals.emails_clicked,
      open_rate: klaviyoTotals.emails_sent > 0 ? (klaviyoTotals.emails_opened / klaviyoTotals.emails_sent) * 100 : 0,
      click_rate: klaviyoTotals.emails_sent > 0 ? (klaviyoTotals.emails_clicked / klaviyoTotals.emails_sent) * 100 : 0,
      active_flows: latestKlaviyo?.active_flows || 0,
      subscriber_count: latestKlaviyo?.subscriber_count || 0,
      daily: klaviyo,
    },
  };
}
