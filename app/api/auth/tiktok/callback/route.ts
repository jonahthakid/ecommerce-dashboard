import { NextRequest, NextResponse } from 'next/server';

const TIKTOK_APP_ID = process.env.TIKTOK_APP_ID!;
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authCode = searchParams.get('auth_code');

  if (!authCode) {
    return NextResponse.json({ error: 'No auth code provided' }, { status: 400 });
  }

  try {
    // Exchange auth code for access token
    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: TIKTOK_APP_ID,
        secret: TIKTOK_APP_SECRET,
        auth_code: authCode,
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      return NextResponse.json({
        error: 'Failed to get access token',
        details: data.message,
        data
      }, { status: 400 });
    }

    // Return the token info - user should save this
    return NextResponse.json({
      success: true,
      message: 'Add these to your environment variables:',
      access_token: data.data.access_token,
      advertiser_ids: data.data.advertiser_ids,
      instructions: [
        `TIKTOK_ACCESS_TOKEN="${data.data.access_token}"`,
        `TIKTOK_ADVERTISER_ID="${data.data.advertiser_ids?.[0] || 'YOUR_ADVERTISER_ID'}"`,
      ],
    });
  } catch (error) {
    return NextResponse.json({
      error: 'OAuth failed',
      details: String(error)
    }, { status: 500 });
  }
}
