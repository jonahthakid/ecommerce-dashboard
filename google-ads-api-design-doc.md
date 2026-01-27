# Google Ads API Integration - Design Documentation

## 1. Application Overview

**Application Name:** E-commerce Analytics Dashboard  
**Developer:** Jonah @ ProShop Inc.  
**Application Type:** Internal business intelligence tool  
**Purpose:** Aggregate advertising metrics from multiple platforms into a unified dashboard for internal performance monitoring

## 2. Use Case Description

This is an **internal tool** used exclusively by ProShop Inc. to monitor advertising performance across multiple platforms (Google Ads, Meta, TikTok, Snapchat) alongside e-commerce metrics from Shopify.

The dashboard provides:
- Daily ad spend tracking across all platforms
- Return on Ad Spend (ROAS) calculations
- Blended performance metrics
- Historical trend analysis

**This tool is NOT:**
- A third-party service offered to other advertisers
- A tool that manages or modifies ad campaigns
- An automated bidding or optimization tool

## 3. Google Ads API Usage

### 3.1 Data Accessed
We request **read-only** access to the following metrics:
- `metrics.cost_micros` — Daily advertising spend
- `metrics.conversions_value` — Conversion value for ROAS calculation
- `segments.date` — Date segmentation for daily reporting

### 3.2 API Operations Used
- `googleAds:search` — Query campaign performance data
- Authentication via OAuth 2.0 refresh token flow

### 3.3 Query Example
```sql
SELECT
  segments.date,
  metrics.cost_micros,
  metrics.conversions_value
FROM customer
WHERE segments.date = '2024-01-15'
```

## 4. Data Flow Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Google Ads API │────▶│  Next.js Server  │────▶│  PostgreSQL DB  │
│  (Read Only)    │     │  (Vercel)        │     │  (Neon)         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Dashboard UI    │
                        │  (Internal Only) │
                        └──────────────────┘
```

## 5. Data Storage & Security

- **Database:** Vercel Postgres (Neon) with SSL encryption
- **Data Retained:** Aggregated daily metrics only (spend, ROAS)
- **No PII Stored:** We do not store customer data, ad content, or targeting information
- **Access Control:** Dashboard accessible only to authorized ProShop Inc. team members

## 6. Sync Frequency

- **Schedule:** Once daily at 6:00 AM UTC via Vercel Cron
- **Data Range:** Previous day and current day metrics
- **Rate Limiting:** Minimal API usage (~2 queries per day)

## 7. Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Next.js API Routes (Serverless) |
| Database | Vercel Postgres (Neon) |
| Hosting | Vercel |
| Authentication | OAuth 2.0 (Google) |

## 8. Team & Contact

**Company:** ProShop Inc.  
**Primary Contact:** Jonah  
**Email:** Jonah@proshop.inc  
**Role:** Owner/Developer  

## 9. Compliance

- This application accesses only our own Google Ads account
- No third-party advertiser data is accessed
- Read-only access — no campaign modifications
- Data used solely for internal business analytics

---

*Document prepared for Google Ads API Basic Access application*
