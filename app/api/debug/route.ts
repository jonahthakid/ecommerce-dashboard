import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') ||
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const startOfDay = `${date}T00:00:00-05:00`;
  const endOfDay = `${date}T23:59:59-05:00`;

  // Fetch ALL orders (no financial_status filter)
  const allOrdersRes = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders.json?status=any&created_at_min=${startOfDay}&created_at_max=${endOfDay}&limit=250`,
    { headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN } }
  );
  const allOrders = (await allOrdersRes.json()).orders;

  // Fetch only PAID orders
  const paidOrdersRes = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders.json?status=any&financial_status=paid&created_at_min=${startOfDay}&created_at_max=${endOfDay}&limit=250`,
    { headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN } }
  );
  const paidOrders = (await paidOrdersRes.json()).orders;

  // Group all orders by financial_status
  const byStatus: Record<string, number> = {};
  for (const o of allOrders) {
    byStatus[o.financial_status] = (byStatus[o.financial_status] || 0) + 1;
  }

  return NextResponse.json({
    date,
    allOrdersCount: allOrders.length,
    paidOrdersCount: paidOrders.length,
    byFinancialStatus: byStatus,
    sampleOrders: allOrders.slice(0, 5).map((o: any) => ({
      id: o.id,
      financial_status: o.financial_status,
      created_at: o.created_at,
    }))
  });
}
