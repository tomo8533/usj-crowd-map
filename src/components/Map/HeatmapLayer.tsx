'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { RideWithLocation } from '@/types';

export default function HeatmapLayer({ rides }: { rides: RideWithLocation[] }) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);

  useEffect(() => {
    const heatData = rides
      .filter((r) => r.is_open && r.lat && r.lng)
      .map((r) => [r.lat, r.lng, Math.min(r.wait_time / 120, 1.0)] as [number, number, number]);

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (heatData.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layerRef.current = (L as any).heatLayer(heatData, {
      radius: 60,
      blur: 40,
      maxZoom: 18,
      gradient: {
        0.0: '#22c55e',
        0.3: '#eab308',
        0.6: '#f97316',
        1.0: '#ef4444',
      },
    }).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, rides]);

  return null;
}
