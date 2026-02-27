import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'KLAVIYO_API_KEY not set' });
  }

  const headers = {
    'Authorization': `Klaviyo-API-Key ${apiKey}`,
    'revision': '2024-10-15',
    'Accept': 'application/json',
  };

  // 1. Fetch lists
  const listsRes = await fetch('https://a.klaviyo.com/api/lists', { headers });
  const listsData = await listsRes.json();
  const lists = listsData.data || [];

  // 2. For the first list, check profile count endpoint
  let profileCheck = null;
  if (lists.length > 0) {
    const listId = lists[0].id;
    const listName = lists[0].attributes?.name;

    const profRes = await fetch(
      `https://a.klaviyo.com/api/lists/${listId}/profiles?page[size]=1`,
      { headers }
    );
    const profData = await profRes.json();

    profileCheck = {
      listId,
      listName,
      meta: profData.meta || null,
      dataCount: profData.data?.length || 0,
      hasNext: !!profData.links?.next,
    };
  }

  // 3. Try relationships endpoint and profiles with count param
  let relCheck = null;
  let profilesTotal = null;
  if (lists.length > 0) {
    const listId = lists[0].id;

    const relRes = await fetch(
      `https://a.klaviyo.com/api/lists/${listId}/relationships/profiles?page[size]=1`,
      { headers }
    );
    const relData = await relRes.json();
    relCheck = {
      meta: relData.meta || null,
      dataCount: relData.data?.length || 0,
      keys: Object.keys(relData),
    };

    // Try profiles endpoint with additional fields
    const profTotalRes = await fetch(
      `https://a.klaviyo.com/api/profiles?page[size]=1&additional-fields[profile]=`,
      { headers }
    );
    const profTotalData = await profTotalRes.json();
    profilesTotal = {
      meta: profTotalData.meta || null,
      keys: Object.keys(profTotalData),
    };
  }

  return NextResponse.json({
    listCount: lists.length,
    listNames: lists.map((l: { attributes?: { name?: string } }) => l.attributes?.name),
    profileCheck,
    relCheck,
    profilesTotal,
  });
}
