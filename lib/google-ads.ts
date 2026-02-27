import { google } from 'googleapis';

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1FtoFCjEO4urh5P15FutNX6T-YIcGhZn5keBrzhlKAig';
const SHEET_NAME = 'GoogleAdsData';
const GA4_CREDENTIALS = process.env.GA4_CREDENTIALS;

interface SheetRow {
  date: string;
  spend: number;
  conversions_value: number;
  roas: number;
}

async function getAuthClient() {
  if (!GA4_CREDENTIALS) {
    throw new Error('GA4_CREDENTIALS not set');
  }

  const credentials = JSON.parse(GA4_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return auth;
}

async function fetchSheetData(): Promise<SheetRow[]> {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:E`,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  // Skip header row
  return rows.slice(1).map(row => ({
    date: row[0] || '',
    spend: parseFloat(row[1]) || 0,
    conversions_value: parseFloat(row[2]) || 0,
    roas: parseFloat(row[3]) || 0,
  }));
}

export async function getDailyMetrics(date: string) {
  try {
    const data = await fetchSheetData();

    // Match date in either format (YYYYMMDD or YYYY-MM-DD)
    const dateNoDashes = date.replace(/-/g, '');
    const row = data.find(r => r.date === date || r.date === dateNoDashes);

    if (!row) {
      return {
        date,
        platform: 'google' as const,
        spend: 0,
        roas: 0,
        paid_reach: 0,
      };
    }

    return {
      date,
      platform: 'google' as const,
      spend: row.spend,
      roas: row.roas,
      paid_reach: 0,
    };
  } catch (error) {
    console.error('Google Sheets fetch error:', error);
    return {
      date,
      platform: 'google' as const,
      spend: 0,
      roas: 0,
      paid_reach: 0,
    };
  }
}
