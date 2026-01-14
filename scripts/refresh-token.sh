#!/bin/bash
# Run this script to refresh the Shopify token (expires every 24 hours)
# Usage: ./scripts/refresh-token.sh

TOKEN=$(curl -s -X POST "https://sugarloafsocialclub.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=bf175ac9b2b376417657ddc5de8c9ec9&client_secret=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" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Got new token: ${TOKEN:0:10}..."

# Remove old token and add new one
npx vercel env rm SHOPIFY_ACCESS_TOKEN production -y
printf "$TOKEN" | npx vercel env add SHOPIFY_ACCESS_TOKEN production

# Redeploy
npx vercel --prod --yes

echo "Done! Token refreshed and deployed."
