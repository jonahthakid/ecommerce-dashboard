import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await sql`
    SELECT date, orders, revenue FROM shopify_metrics ORDER BY date DESC LIMIT 5
  `;
  return NextResponse.json(result.rows);
}
