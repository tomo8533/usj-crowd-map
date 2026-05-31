import { NextRequest, NextResponse } from 'next/server';
import { fetchAndSaveWaitTimes } from '@/lib/fetchWaitTimes';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await fetchAndSaveWaitTimes();
    console.log(`[cron/fetch-waits] inserted ${result.count} records at ${result.fetched_at}`);
    return NextResponse.json({ message: 'OK', ...result });
  } catch (err) {
    console.error('[cron/fetch-waits] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
