'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from './HeatmapLayer';
import { getWaitColor } from '@/types';
import type { RideWithLocation, SimOffset } from '@/types';

const USJ_CENTER: [number, number] = [34.6655, 135.4323];

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a> | ' +
  'Powered by <a href="https://queue-times.com">Queue-Times.com</a>';

function createBubbleIcon(ride: RideWithLocation): L.DivIcon {
  const { wait_time, is_open } = ride;
  const color = getWaitColor(wait_time, is_open);
  const r = is_open ? Math.min(12 + Math.floor(wait_time / 10), 22) : 14;
  const outer = r + 6;
  const size = outer * 2;
  const label = is_open ? (wait_time > 0 ? `${wait_time}` : '—') : '休止';
  const showLabel = r >= 14;
  const fs = r >= 18 ? 11 : 9;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [outer, outer],
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${outer}" cy="${outer}" r="${outer}" fill="${color}" fill-opacity="0.2"/>
      <circle cx="${outer}" cy="${outer}" r="${r}" fill="${color}"/>
      ${showLabel ? `<text x="${outer}" y="${outer}" dominant-baseline="central" text-anchor="middle" fill="white" font-size="${fs}" font-family="sans-serif" font-weight="700">${label}</text>` : ''}
    </svg>`,
  });
}

// MapContainer の子として useMap() でフォーカス制御
function FlyToController({
  focusedRideId,
  rides,
}: {
  focusedRideId: number | null;
  rides: RideWithLocation[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!focusedRideId) return;
    const ride = rides.find((r) => r.ride_id === focusedRideId);
    if (ride) map.flyTo([ride.lat, ride.lng], 18, { duration: 0.8 });
  }, [focusedRideId, rides, map]);
  return null;
}

interface Props {
  rides: RideWithLocation[];
  focusedRideId: number | null;
  activeAreas: string[];
  offset: SimOffset;
}

export default function MapComponent({ rides, focusedRideId, activeAreas }: Props) {
  const filteredRides =
    activeAreas.length === 0
      ? rides
      : rides.filter((r) => activeAreas.some((area) => r.land_name?.includes(area)));

  return (
    <MapContainer
      center={USJ_CENTER}
      zoom={16}
      minZoom={15}
      maxZoom={19}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <HeatmapLayer rides={filteredRides} />
      <FlyToController focusedRideId={focusedRideId} rides={rides} />
      {filteredRides.map((ride) => (
        <Marker
          key={ride.ride_id}
          position={[ride.lat, ride.lng]}
          icon={createBubbleIcon(ride)}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700 }}>{ride.ride_name}</div>
              <div>{ride.is_open ? `待ち時間: ${ride.wait_time}分` : '休止中'}</div>
              {ride.land_name && (
                <div style={{ color: '#6b7280' }}>{ride.land_name}</div>
              )}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
