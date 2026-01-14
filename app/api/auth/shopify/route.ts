import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ecommerce-dashboard-lyart-iota.vercel.app';

const SCOPES = [
  'read_orders',
  'read_products',
  'read_inventory',
  'read_analytics',
  'read_reports',
].join(',');

export async function GET(request: NextRequest) {
  const shop = SHOPIFY_STORE_DOMAIN;
  const redirectUri = `${APP_URL}/api/auth/shopify/callback`;
  const state = Math.random().toString(36).substring(7);

  // Store state in cookie for verification
  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_CLIENT_ID}` +
    `&scope=${SCOPES}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
