import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await sql`ALTER TABLE ad_metrics ADD COLUMN IF NOT EXISTS paid_reach INTEGER DEFAULT 0`;

    return NextResponse.json({
      success: true,
      message: 'Migration complete: added paid_reach column to ad_metrics',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    );
  }
}
