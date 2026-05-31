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

export interface FetchResult {
  count: number;
  fetched_at: string;
}

export async function fetchAndSaveWaitTimes(): Promise<FetchResult> {
  const fetchedAt = new Date().toISOString();

  const res = await fetch(
    `${QUEUE_TIMES_BASE_URL}/parks/${USJ_PARK_ID}/queue_times.json`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) {
    throw new Error(`Queue-Times API returned ${res.status}`);
  }
  const data = (await res.json()) as QueueTimesResponse;

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
    return { count: 0, fetched_at: fetchedAt };
  }

  const { error } = await supabaseAdmin.from('wait_times').insert(records);
  if (error) throw new Error(error.message);

  return { count: records.length, fetched_at: fetchedAt };
}
