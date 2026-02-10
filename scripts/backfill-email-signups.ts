import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { format, subDays } from 'date-fns';
import { getSignupsInRange } from '../lib/klaviyo';
import { upsertDailySignups, initDatabase } from '../lib/db';

async function backfill(daysBack: number = 30) {
  console.log('Initializing database...');
  await initDatabase();

  const endDate = subDays(new Date(), 1); // Yesterday
  const startDate = subDays(endDate, daysBack - 1);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  console.log(`Backfilling ${daysBack} days from ${startDateStr} to ${endDateStr}`);
  console.log('Fetching all signups in range (this is faster than day-by-day)...\n');

  try {
    const { total, byDate } = await getSignupsInRange(startDateStr, endDateStr);

    console.log(`Found ${total} total signups in range\n`);

    // Store each day's count
    const dates = Object.keys(byDate).sort();
    for (const date of dates) {
      const count = byDate[date];
      await upsertDailySignups(date, count);
      console.log(`  ${date}: ${count} signups`);
    }

    // Fill in missing days with 0
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (!byDate[dateStr]) {
        await upsertDailySignups(dateStr, 0);
        console.log(`  ${dateStr}: 0 signups (no data)`);
      }
      current.setDate(current.getDate() + 1);
    }

    console.log('\nBackfill complete!');
  } catch (error) {
    console.error('Backfill failed:', error);
  }
}

// Get days from command line argument, default to 30
const daysBack = parseInt(process.argv[2] || '30', 10);
backfill(daysBack).catch(console.error);
