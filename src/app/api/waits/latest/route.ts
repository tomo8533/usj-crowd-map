import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export async function GET() {
  const { data: latestRow, error: e1 } = await supabase
    .from('wait_times')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (e1 || !latestRow) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 });
  }

  const [{ data: waitData, error: e2 }, { data: locations, error: e3 }] =
    await Promise.all([
      supabase
        .from('wait_times')
        .select('ride_id, ride_name, wait_time, is_open, last_updated')
        .eq('fetched_at', latestRow.fetched_at),
      // land_name は ride_locations の値を正とする（API の生データは表記ゆれあり）
      supabase
        .from('ride_locations')
        .select('ride_id, lat, lng, land_name'),
    ]);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  const locationMap = new Map(
    (locations ?? []).map((l) => [
      l.ride_id,
      { lat: l.lat, lng: l.lng, land_name: l.land_name as string | null },
    ])
  );

  const rides = (waitData ?? [])
    .map((w) => {
      const loc = locationMap.get(w.ride_id);
      if (!loc) return null;
      return {
        ...w,
        land_name: loc.land_name, // ride_locations の統一済み land_name を使う
        lat: loc.lat,
        lng: loc.lng,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ fetched_at: latestRow.fetched_at, rides });
}
