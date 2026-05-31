import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

function getJSTDowAndMinutes(date: Date): { dow: number; minutes: number } {
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  return {
    dow: jst.getUTCDay(),
    minutes: jst.getUTCHours() * 60 + jst.getUTCMinutes(),
  };
}

// 過去データが不足している初期期間向けの時間帯ヒューリスティック
// USJ の典型的な混雑カーブ（13時ピーク）をモデル化した倍率を返す
function timeOfDayMultiplier(currentMinutes: number, offsetMin: number): number {
  const peakMinutes = 13 * 60; // 13:00 JST がピーク
  const currentBusy = 1 - Math.abs(currentMinutes - peakMinutes) / (8 * 60);
  const targetMinutes = currentMinutes + offsetMin;
  const targetBusy = 1 - Math.abs(targetMinutes - peakMinutes) / (8 * 60);
  // 比率を 0.5〜1.5 にクランプして極端な値を防ぐ
  return Math.max(0.5, Math.min(1.5, targetBusy / Math.max(currentBusy, 0.1)));
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

  const { data: latestRow } = await supabase
    .from('wait_times')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRow) {
    return NextResponse.json({ error: 'データがありません' }, { status: 404 });
  }

  const [
    { data: waitData },
    { data: locations },
    { data: currentHist },
    { data: targetHist },
  ] = await Promise.all([
    supabase
      .from('wait_times')
      .select('ride_id, ride_name, wait_time, is_open, last_updated')
      .eq('fetched_at', latestRow.fetched_at),
    // land_name は ride_locations の統一値を使う（Bug 1 対応と同様）
    supabase.from('ride_locations').select('ride_id, lat, lng, land_name'),
    supabase.rpc('get_historical_avg', { p_dow: currentDow, p_minutes: currentMinutes }),
    supabase.rpc('get_historical_avg', { p_dow: targetDow, p_minutes: targetMinutes }),
  ]);

  const locationMap = new Map(
    (locations ?? []).map((l) => [
      l.ride_id,
      { lat: l.lat, lng: l.lng, land_name: l.land_name as string | null },
    ])
  );
  const currentHistMap = new Map<number, number>(
    ((currentHist as HistRow[]) ?? []).map((r) => [r.ride_id, r.avg_wait])
  );
  const targetHistMap = new Map<number, number>(
    ((targetHist as HistRow[]) ?? []).map((r) => [r.ride_id, r.avg_wait])
  );

  const hasEnoughData = currentHistMap.size >= 3 && targetHistMap.size >= 3;
  // 初期期間用の時間帯倍率（hasEnoughData = false のときのみ使用）
  const heuristicMultiplier = timeOfDayMultiplier(currentMinutes, offsetMin);

  const rides = (waitData ?? [])
    .map((w) => {
      const loc = locationMap.get(w.ride_id);
      if (!loc) return null;

      let estimatedWait = w.wait_time;

      if (w.is_open) {
        if (hasEnoughData) {
          // 過去統計スケール法
          const currentAvg = currentHistMap.get(w.ride_id);
          const targetAvg = targetHistMap.get(w.ride_id);
          if (targetAvg !== undefined) {
            const scale = currentAvg && currentAvg > 0 ? w.wait_time / currentAvg : 1;
            estimatedWait = Math.round(targetAvg * scale);
          }
        } else {
          // データ不足時: 時間帯ヒューリスティックで概算値を返す
          estimatedWait = Math.round(w.wait_time * heuristicMultiplier);
        }
        estimatedWait = Math.max(5, Math.min(150, estimatedWait));
      }

      return {
        ...w,
        land_name: loc.land_name,
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
