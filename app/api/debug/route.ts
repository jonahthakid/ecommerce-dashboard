import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getOrdersForDate } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // Get what's in the database
  const dbResult = await sql`
    SELECT date, orders, revenue FROM shopify_metrics ORDER BY date DESC LIMIT 5
  `;

  // Get fresh data from Shopify API
  const shopifyOrders = await getOrdersForDate(today);

  return NextResponse.json({
    today,
    database: dbResult.rows,
    shopifyApi: {
      orderCount: shopifyOrders.length,
      orders: shopifyOrders.map(o => ({
        id: o.id,
        created_at: o.created_at,
        total: o.subtotal_price
      }))
    }
  });
}
