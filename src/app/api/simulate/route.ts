import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

// UTC → JST の曜日・分を返す
function getJSTDowAndMinutes(date: Date): { dow: number; minutes: number } {
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  return {
    dow: jst.getUTCDay(),                                          // 0=日曜
    minutes: jst.getUTCHours() * 60 + jst.getUTCMinutes(),
  };
}

interface HistRow { ride_id: number; avg_wait: number }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offsetMin = parseInt(searchParams.get('offset_min') ?? '30', 10);

  if (![30, 60, 180].includes(offsetMin)) {
    return NextResponse.json(
      { error: 'offset_min は 30, 60, 180 のいずれかを指定してください' },
      { status: 400 }
    );
  }

  const now = new Date();
  const targetTime = new Date(now.getTime() + offsetMin * 60 * 1000);

  const { dow: currentDow, minutes: currentMinutes } = getJSTDowAndMinutes(now);
  const { dow: targetDow, minutes: targetMinutes } = getJSTDowAndMinutes(targetTime);

  // 最新 fetched_at を取得
  const { data: latestRow } = await supabase
    .from('wait_times')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRow) {
    return NextResponse.json({ error: 'データがありません' }, { status: 404 });
  }

  // 並列クエリ
  const [
    { data: waitData },
    { data: locations },
    { data: currentHist },
    { data: targetHist },
  ] = await Promise.all([
    // 現在の待ち時間
    supabase
      .from('wait_times')
      .select('ride_id, ride_name, land_name, wait_time, is_open, last_updated')
      .eq('fetched_at', latestRow.fetched_at),
    // 座標マスタ
    supabase.from('ride_locations').select('ride_id, lat, lng'),
    // 現在時刻の過去平均（スケール係数の分母）
    supabase.rpc('get_historical_avg', {
      p_dow: currentDow,
      p_minutes: currentMinutes,
    }),
    // 目標時刻の過去平均（スケール係数の分子に掛ける）
    supabase.rpc('get_historical_avg', {
      p_dow: targetDow,
      p_minutes: targetMinutes,
    }),
  ]);

  const locationMap = new Map(
    (locations ?? []).map((l) => [l.ride_id, { lat: l.lat, lng: l.lng }])
  );
  const currentHistMap = new Map<number, number>(
    ((currentHist as HistRow[]) ?? []).map((r) => [r.ride_id, r.avg_wait])
  );
  const targetHistMap = new Map<number, number>(
    ((targetHist as HistRow[]) ?? []).map((r) => [r.ride_id, r.avg_wait])
  );

  // 過去データが揃っているか（データ蓄積が少ない初期は false）
  const hasEnoughData = currentHistMap.size >= 3 && targetHistMap.size >= 3;

  const rides = (waitData ?? [])
    .map((w) => {
      const loc = locationMap.get(w.ride_id);
      if (!loc) return null;

      let estimatedWait = w.wait_time;

      if (hasEnoughData && w.is_open) {
        const currentAvg = currentHistMap.get(w.ride_id);
        const targetAvg = targetHistMap.get(w.ride_id);

        if (targetAvg !== undefined) {
          const scale =
            currentAvg && currentAvg > 0 ? w.wait_time / currentAvg : 1;
          estimatedWait = Math.round(targetAvg * scale);
          // クリッピング: 0以下 → 5分、150分超 → 150分
          estimatedWait = Math.max(5, Math.min(150, estimatedWait));
        }
      }

      return {
        ...w,
        wait_time: estimatedWait,
        lat: loc.lat,
        lng: loc.lng,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    fetched_at: latestRow.fetched_at,
    simulated_at: targetTime.toISOString(),
    offset_min: offsetMin,
    low_accuracy: !hasEnoughData,
    rides,
  });
}
