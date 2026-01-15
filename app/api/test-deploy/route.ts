import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    deployed: true,
    timestamp: '2026-01-15-test-v1',
    cron_secret_exists: !!process.env.CRON_SECRET
  });
}
