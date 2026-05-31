'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import DynamicMap from '@/components/Map';
import type { WaitTimesApiResponse, SimulateApiResponse, SummaryApiResponse, SimOffset } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const [selectedOffset, setSelectedOffset] = useState<SimOffset>(0);
  const [activeAreas, setActiveAreas] = useState<string[]>([]);
  const [focusedRideId, setFocusedRideId] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(false);

  const { data: latestData, isLoading, mutate } = useSWR<WaitTimesApiResponse>(
    '/api/waits/latest',
    fetcher,
    { refreshInterval: 5 * 60 * 1000, revalidateOnFocus: false }
  );

  const { data: simData } = useSWR<SimulateApiResponse>(
    selectedOffset > 0 ? `/api/simulate?offset_min=${selectedOffset}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: summaryData } = useSWR<SummaryApiResponse>(
    '/api/waits/summary',
    fetcher,
    { refreshInterval: 5 * 60 * 1000, revalidateOnFocus: false }
  );

  // シミュレーションデータが有効なレスポンス（rides を持つ）なら優先使用
  const hasValidSimData = selectedOffset > 0 && Array.isArray(simData?.rides);
  const displayData = hasValidSimData ? simData : latestData;
  const rides = displayData?.rides ?? [];

  const handleAreaToggle = useCallback((match: string | null) => {
    if (match === null) {
      setActiveAreas([]);
      return;
    }
    setActiveAreas((prev) =>
      prev.includes(match) ? prev.filter((a) => a !== match) : [...prev, match]
    );
  }, []);

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <TopBar
        fetchedAt={displayData?.fetched_at ?? null}
        isLoading={isLoading}
        onRefresh={() => mutate()}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          rides={rides}
          summary={summaryData ?? null}
          activeAreas={activeAreas}
          onAreaToggle={handleAreaToggle}
          selectedOffset={selectedOffset}
          onOffsetChange={setSelectedOffset}
          onRideClick={setFocusedRideId}
          isSimulated={selectedOffset > 0}
          lowAccuracy={simData?.low_accuracy ?? false}
        />
        <div className="flex-1 min-h-0">
          <DynamicMap
            rides={rides}
            focusedRideId={focusedRideId}
            activeAreas={activeAreas}
            offset={selectedOffset}
            showLabels={showLabels}
          />
        </div>
      </div>
    </div>
  );
}
