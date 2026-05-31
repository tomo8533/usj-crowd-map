import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const QUEUE_TIMES_BASE_URL =
  process.env.QUEUE_TIMES_BASE_URL ?? 'https://queue-times.com';
const USJ_PARK_ID = process.env.USJ_PARK_ID ?? '284';

interface QueueTimesRide {
  id: number;
  name: string;
  is_open: boolean;
  wait_time: number;
  last_updated: string;
}

interface QueueTimesLand {
  id: number;
  name: string;
  rides: QueueTimesRide[];
}

interface QueueTimesResponse {
  lands: QueueTimesLand[];
  rides: QueueTimesRide[];
}

export async function GET(req: NextRequest) {
  // Cron Secret 認証
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fetchedAt = new Date().toISOString();

  // Queue-Times API からデータ取得
  let data: QueueTimesResponse;
  try {
    const res = await fetch(
      `${QUEUE_TIMES_BASE_URL}/parks/${USJ_PARK_ID}/queue_times.json`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) {
      throw new Error(`Queue-Times API returned ${res.status}`);
    }
    data = (await res.json()) as QueueTimesResponse;
  } catch (err) {
    console.error('[fetch-waits] fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch from Queue-Times API' },
      { status: 502 }
    );
  }

  // lands 配列からレコードを組み立て
  const records: {
    ride_id: number;
    ride_name: string;
    land_id: number | null;
    land_name: string | null;
    wait_time: number;
    is_open: boolean;
    fetched_at: string;
    last_updated: string | null;
  }[] = [];

  for (const land of data.lands) {
    for (const ride of land.rides) {
      records.push({
        ride_id: ride.id,
        ride_name: ride.name,
        land_id: land.id,
        land_name: land.name,
        wait_time: ride.wait_time ?? 0,
        is_open: ride.is_open ?? false,
        fetched_at: fetchedAt,
        last_updated: ride.last_updated ?? null,
      });
    }
  }

  // rides（land未所属）も念のため処理
  for (const ride of data.rides ?? []) {
    records.push({
      ride_id: ride.id,
      ride_name: ride.name,
      land_id: null,
      land_name: null,
      wait_time: ride.wait_time ?? 0,
      is_open: ride.is_open ?? false,
      fetched_at: fetchedAt,
      last_updated: ride.last_updated ?? null,
    });
  }

  if (records.length === 0) {
    return NextResponse.json({ message: 'No ride data found', count: 0 });
  }

  // Supabase に INSERT
  const { error } = await supabaseAdmin.from('wait_times').insert(records);

  if (error) {
    console.error('[fetch-waits] supabase error:', error);
    return NextResponse.json(
      { error: 'Failed to insert into Supabase', detail: error.message },
      { status: 500 }
    );
  }

  console.log(`[fetch-waits] inserted ${records.length} records at ${fetchedAt}`);
  return NextResponse.json({
    message: 'OK',
    count: records.length,
    fetched_at: fetchedAt,
  });
}
