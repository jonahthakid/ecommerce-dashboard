import { NextResponse } from 'next/server';

const TIKTOK_APP_ID = process.env.TIKTOK_APP_ID!;
const REDIRECT_URI = 'https://ecommerce-dashboard-lyart-iota.vercel.app/api/auth/tiktok/callback';

export async function GET() {
  const state = Math.random().toString(36).substring(7);

  const authUrl = new URL('https://business-api.tiktok.com/portal/auth');
  authUrl.searchParams.set('app_id', TIKTOK_APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
