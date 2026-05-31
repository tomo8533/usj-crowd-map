import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

function toCongestionLabel(avg: number): { level: string; label: string } {
  if (avg <= 20) return { level: 'empty', label: '空き' };
  if (avg <= 45) return { level: 'normal', label: '普通' };
  if (avg <= 70) return { level: 'busy', label: '混雑' };
  return { level: 'very_busy', label: '激混み' };
}

export async function GET() {
  const { data: latestRow } = await supabase
    .from('wait_times')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRow) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 });
  }

  const { data } = await supabase
    .from('wait_times')
    .select('wait_time, is_open')
    .eq('fetched_at', latestRow.fetched_at);

  const rows = data ?? [];
  const open = rows.filter((r) => r.is_open);
  const openCount = open.length;
  const avgWait =
    openCount > 0
      ? Math.round(open.reduce((s, r) => s + r.wait_time, 0) / openCount)
      : 0;

  const { level, label } = toCongestionLabel(avgWait);

  return NextResponse.json({
    avg_wait: avgWait,
    congestion_level: level,
    congestion_label: label,
    open_count: openCount,
    total_count: rows.length,
    fetched_at: latestRow.fetched_at,
  });
}
