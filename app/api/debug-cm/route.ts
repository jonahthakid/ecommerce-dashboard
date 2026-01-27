import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Ensure column exists
  await initDatabase();

  // Check what columns exist and current values
  const result = await sql`
    SELECT date, orders, revenue, contribution_margin
    FROM shopify_metrics
    ORDER BY date DESC
    LIMIT 3
  `;

  return NextResponse.json({
    columns: result.fields?.map(f => f.name),
    rows: result.rows
  });
}
