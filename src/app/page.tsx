'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import MobileDrawer from '@/components/MobileDrawer';
import DynamicMap from '@/components/Map';
import type { WaitTimesApiResponse, SimulateApiResponse, SummaryApiResponse, SimOffset } from '@/types';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json());

export default function Home() {
  const [selectedOffset, setSelectedOffset] = useState<SimOffset>(0);
  const [activeAreas, setActiveAreas] = useState<string[]>([]);
  const [focusedRideId, setFocusedRideId] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [showAreaPolygons, setShowAreaPolygons] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const {
    data: latestData,
    isValidating: isValidatingLatest,
    mutate: mutateLatest,
  } = useSWR<WaitTimesApiResponse>('/api/waits/latest', fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const {
    data: simData,
    isValidating: isValidatingSim,
    mutate: mutateSim,
  } = useSWR<SimulateApiResponse>(
    selectedOffset > 0 ? `/api/simulate?offset_min=${selectedOffset}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: summaryData, mutate: mutateSummary } =
    useSWR<SummaryApiResponse>('/api/waits/summary', fetcher, {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
    });

  // isValidating は初回ロード中も revalidation 中も true になるので
  // スピナーの表示状態として使う
  const isLoading =
    isValidatingLatest || (selectedOffset > 0 && isValidatingSim);

  const hasValidSimData = selectedOffset > 0 && Array.isArray(simData?.rides);
  const displayData = hasValidSimData ? simData : latestData;
  const rides = displayData?.rides ?? [];

  const handleRefresh = useCallback(() => {
    mutateLatest();
    mutateSim();
    mutateSummary();
  }, [mutateLatest, mutateSim, mutateSummary]);

  const handleAreaToggle = useCallback((match: string | null) => {
    if (match === null) {
      setActiveAreas([]);
      return;
    }
    setActiveAreas((prev) =>
      prev.includes(match) ? prev.filter((a) => a !== match) : [...prev, match]
    );
  }, []);

  const sidebarProps = {
    rides,
    summary: summaryData ?? null,
    activeAreas,
    onAreaToggle: handleAreaToggle,
    selectedOffset,
    onOffsetChange: setSelectedOffset,
    onRideClick: setFocusedRideId,
    isSimulated: selectedOffset > 0,
    lowAccuracy: simData?.low_accuracy ?? false,
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <TopBar
        fetchedAt={displayData?.fetched_at ?? null}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
        showAreaPolygons={showAreaPolygons}
        onToggleAreaPolygons={() => setShowAreaPolygons((v) => !v)}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar {...sidebarProps} />
        <div className="flex-1 min-h-0">
          <DynamicMap
            rides={rides}
            focusedRideId={focusedRideId}
            activeAreas={activeAreas}
            offset={selectedOffset}
            showLabels={showLabels}
            showAreaPolygons={showAreaPolygons}
            isMobile={isMobile}
          />
        </div>
      </div>
      <MobileDrawer
        {...sidebarProps}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
        showAreaPolygons={showAreaPolygons}
        onToggleAreaPolygons={() => setShowAreaPolygons((v) => !v)}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
    </div>
  );
}
