import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export async function GET() {
  // 最新の fetched_at を取得
  const { data: latestRow, error: e1 } = await supabase
    .from('wait_times')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (e1 || !latestRow) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 });
  }

  // その fetched_at の全レコードを取得
  const { data: waitData, error: e2 } = await supabase
    .from('wait_times')
    .select('ride_id, ride_name, land_name, wait_time, is_open, last_updated')
    .eq('fetched_at', latestRow.fetched_at);

  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  // 座標マスタ取得
  const { data: locations, error: e3 } = await supabase
    .from('ride_locations')
    .select('ride_id, lat, lng');

  if (e3) {
    return NextResponse.json({ error: e3.message }, { status: 500 });
  }

  const locationMap = new Map(
    (locations ?? []).map((l) => [l.ride_id, { lat: l.lat, lng: l.lng }])
  );

  // wait_times と ride_locations をコード側で結合
  const rides = (waitData ?? [])
    .map((w) => {
      const loc = locationMap.get(w.ride_id);
      if (!loc) return null;
      return { ...w, lat: loc.lat, lng: loc.lng };
    })
    .filter(Boolean);

  return NextResponse.json({
    fetched_at: latestRow.fetched_at,
    rides,
  });
}
