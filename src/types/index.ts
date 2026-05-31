export interface RideWithLocation {
  ride_id: number;
  ride_name: string;
  land_name: string | null;
  wait_time: number;
  is_open: boolean;
  lat: number;
  lng: number;
  last_updated: string | null;
}

export interface WaitTimesApiResponse {
  fetched_at: string;
  rides: RideWithLocation[];
}

export interface SimulateApiResponse extends WaitTimesApiResponse {
  simulated_at: string;
  offset_min: number;
  low_accuracy: boolean;
}

export interface SummaryApiResponse {
  avg_wait: number;
  congestion_level: string;
  congestion_label: string;
  open_count: number;
  total_count: number;
  fetched_at: string;
}

export type SimOffset = 0 | 30 | 60 | 180;

export const TIME_TABS: { label: string; offset: SimOffset }[] = [
  { label: '現在', offset: 0 },
  { label: '+30分', offset: 30 },
  { label: '+1時間', offset: 60 },
  { label: '+3時間', offset: 180 },
];

export const AREA_FILTERS: { label: string; match: string | null }[] = [
  { label: '全て', match: null },
  { label: 'ハリポタ', match: 'Harry Potter' },
  { label: 'マリオ/DK', match: 'Nintendo' },
  { label: 'ジュラシック', match: 'Jurassic' },
  { label: 'JAWS', match: 'Amity' },
  { label: 'ハリウッド', match: 'Hollywood' },
  { label: 'ミニオン', match: 'Minion' },
  { label: 'ワンダーランド', match: 'Wonderland' },
  { label: '特設', match: '特設' },
];

export function getWaitColor(waitTime: number, isOpen: boolean): string {
  if (!isOpen) return '#9ca3af';
  if (waitTime <= 20) return '#22c55e';
  if (waitTime <= 45) return '#eab308';
  if (waitTime <= 70) return '#f97316';
  return '#ef4444';
}

export function getWaitLabel(waitTime: number, isOpen: boolean): string {
  if (!isOpen) return 'クローズ';
  if (waitTime <= 20) return '空き';
  if (waitTime <= 45) return '普通';
  if (waitTime <= 70) return '混雑';
  return '激混み';
}
