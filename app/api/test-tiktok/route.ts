import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN!;
const TIKTOK_ADVERTISER_ID = process.env.TIKTOK_ADVERTISER_ID!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || '2026-01-22';

  const results: Record<string, unknown> = {
    advertiser_id: TIKTOK_ADVERTISER_ID,
    date,
    token_preview: TIKTOK_ACCESS_TOKEN?.substring(0, 10) + '...',
  };

  // Test 1: Get advertiser info (GET request)
  try {
    const advResponse = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${TIKTOK_ADVERTISER_ID}"]`,
      {
        headers: {
          'Access-Token': TIKTOK_ACCESS_TOKEN,
        },
      }
    );
    const advData = await advResponse.json();
    results['advertiser_info'] = { status: advResponse.status, data: advData };
  } catch (e) {
    results['advertiser_info'] = { error: String(e) };
  }

  // Test 2: Campaign list (GET request)
  try {
    const campResponse = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${TIKTOK_ADVERTISER_ID}&page_size=10`,
      {
        headers: {
          'Access-Token': TIKTOK_ACCESS_TOKEN,
        },
      }
    );
    const campData = await campResponse.json();
    results['campaigns'] = { status: campResponse.status, data: campData };
  } catch (e) {
    results['campaigns'] = { error: String(e) };
  }

  // Test 3: Basic report via GET with query params
  try {
    const params = new URLSearchParams({
      advertiser_id: TIKTOK_ADVERTISER_ID,
      report_type: 'BASIC',
      dimensions: JSON.stringify(['stat_time_day']),
      data_level: 'AUCTION_ADVERTISER',
      metrics: JSON.stringify(['spend', 'cpc', 'impressions', 'clicks']),
      start_date: date,
      end_date: date,
    });
    const reportResponse = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params}`,
      {
        headers: {
          'Access-Token': TIKTOK_ACCESS_TOKEN,
        },
      }
    );
    const reportData = await reportResponse.json();
    results['report_get'] = { status: reportResponse.status, data: reportData };
  } catch (e) {
    results['report_get'] = { error: String(e) };
  }

  return NextResponse.json(results);
}
