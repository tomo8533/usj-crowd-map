'use client';

import { useMemo } from 'react';
import { AREA_FILTERS, TIME_TABS, getWaitColor } from '@/types';
import type { RideWithLocation, SummaryApiResponse, SimOffset } from '@/types';

interface Props {
  rides: RideWithLocation[];
  summary: SummaryApiResponse | null;
  activeAreas: string[];
  onAreaToggle: (match: string | null) => void;
  selectedOffset: SimOffset;
  onOffsetChange: (offset: SimOffset) => void;
  onRideClick: (rideId: number) => void;
  isSimulated: boolean;
  lowAccuracy: boolean;
}

export default function Sidebar({
  rides,
  summary,
  activeAreas,
  onAreaToggle,
  selectedOffset,
  onOffsetChange,
  onRideClick,
  isSimulated,
  lowAccuracy,
}: Props) {
  const sortedRides = useMemo(() => {
    const open = rides.filter((r) => r.is_open).sort((a, b) => b.wait_time - a.wait_time);
    const closed = rides.filter((r) => !r.is_open);
    return [...open, ...closed];
  }, [rides]);

  const displayRides = useMemo(() => {
    if (activeAreas.length === 0) return sortedRides;
    return sortedRides.filter((r) =>
      activeAreas.some((area) => r.land_name?.includes(area))
    );
  }, [sortedRides, activeAreas]);

  return (
    <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">

      {/* 時間帯タブ */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex gap-1">
          {TIME_TABS.map((tab) => (
            <button
              key={tab.offset}
              onClick={() => onOffsetChange(tab.offset)}
              className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                selectedOffset === tab.offset
                  ? 'bg-[#E63946] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isSimulated && (
          <p className="text-[10px] text-amber-600 mt-1.5 leading-tight">
            {lowAccuracy
              ? '※データ蓄積が少ないため精度が低い場合があります'
              : '※シミュレーション値（参考情報）'}
          </p>
        )}
      </div>

      {/* サマリーパネル */}
      <div className="p-3 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            label="平均待ち時間"
            value={summary ? `${summary.avg_wait}分` : '---'}
          />
          <SummaryCard
            label="混雑レベル"
            value={summary?.congestion_label ?? '---'}
          />
          <SummaryCard
            label="営業中施設"
            value={summary ? `${summary.open_count} / ${summary.total_count}` : '---'}
          />
          <SummaryCard label="本日の狙い目" value="--:--" />
        </div>
      </div>

      {/* エリアフィルター */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex flex-wrap gap-1">
          {AREA_FILTERS.map((f) => {
            const isActive =
              f.match === null
                ? activeAreas.length === 0
                : activeAreas.includes(f.match);
            return (
              <button
                key={f.label}
                onClick={() => onAreaToggle(f.match)}
                className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-[#E63946] text-white border-[#E63946]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* アトラクション一覧 */}
      <div className="flex-1 overflow-y-auto">
        {displayRides.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">データなし</p>
        ) : (
          displayRides.map((ride) => (
            <button
              key={ride.ride_id}
              onClick={() => onRideClick(ride.ride_id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 transition-colors"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getWaitColor(ride.wait_time, ride.is_open) }}
              />
              <span
                className={`flex-1 text-xs leading-tight truncate ${
                  !ride.is_open ? 'text-gray-400' : 'text-gray-800'
                }`}
              >
                {ride.ride_name}
              </span>
              <span
                className="text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: ride.is_open
                    ? getWaitColor(ride.wait_time, true) + '22'
                    : '#f3f4f6',
                  color: ride.is_open
                    ? getWaitColor(ride.wait_time, true)
                    : '#9ca3af',
                }}
              >
                {ride.is_open ? `${ride.wait_time}分` : '休止'}
              </span>
            </button>
          ))
        )}
      </div>

      {/* 凡例 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="grid grid-cols-2 gap-y-1 gap-x-2">
          {[
            { color: '#22c55e', label: '〜20分 空き' },
            { color: '#eab308', label: '21〜45分 普通' },
            { color: '#f97316', label: '46〜70分 混雑' },
            { color: '#ef4444', label: '71分〜 激混み' },
          ].map((item) => (
            <div key={item.color} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="text-[10px] text-gray-500 leading-tight">{label}</div>
      <div className="font-bold text-gray-800 text-sm mt-0.5">{value}</div>
    </div>
  );
}
