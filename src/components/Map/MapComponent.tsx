'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from './HeatmapLayer';
import { getWaitColor } from '@/types';
import type { RideWithLocation, SimOffset } from '@/types';

const USJ_CENTER: [number, number] = [34.6655, 135.4323];
const USJ_BOUNDS: [[number, number], [number, number]] = [
  [34.655, 135.420],
  [34.675, 135.445],
];

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a> | ' +
  'Powered by <a href="https://queue-times.com">Queue-Times.com</a>';

function createBubbleIcon(ride: RideWithLocation, isMobile = false): L.DivIcon {
  const { wait_time, is_open } = ride;
  const color = getWaitColor(wait_time, is_open);
  const base = isMobile ? 14 : 12;
  const max = isMobile ? 24 : 22;
  const r = is_open ? Math.min(base + Math.floor(wait_time / 10), max) : (isMobile ? 16 : 14);
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

function ResetControl() {
  const map = useMap();

  useEffect(() => {
    class HomeControl extends L.Control {
      onAdd(): HTMLElement {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const a = L.DomUtil.create('a', '', div) as HTMLAnchorElement;
        a.innerHTML = '⌂';
        a.href = '#';
        a.title = '初期位置に戻る';
        a.style.cssText =
          'font-size:18px;line-height:26px;display:block;width:26px;height:26px;' +
          'text-align:center;text-decoration:none;color:#333;background:white;';
        L.DomEvent.on(a, 'click', (e) => {
          L.DomEvent.stop(e as Event);
          map.flyTo(USJ_CENTER, 16, { duration: 0.8 });
        });
        return div;
      }
      onRemove(): void {}
    }
    const ctrl = new HomeControl({ position: 'topright' });
    ctrl.addTo(map);
    return () => {
      ctrl.remove();
    };
  }, [map]);

  return null;
}

interface Props {
  rides: RideWithLocation[];
  focusedRideId: number | null;
  activeAreas: string[];
  offset: SimOffset;
  showLabels: boolean;
  isMobile?: boolean;
}

export default function MapComponent({
  rides,
  focusedRideId,
  activeAreas,
  showLabels,
  isMobile = false,
}: Props) {
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
      maxBounds={USJ_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <HeatmapLayer rides={filteredRides} />
      <FlyToController focusedRideId={focusedRideId} rides={rides} />
      <ResetControl />
      {filteredRides.map((ride) => (
        <Marker
          key={`${ride.ride_id}-${showLabels}`}
          position={[ride.lat, ride.lng]}
          icon={createBubbleIcon(ride, isMobile)}
        >
          {showLabels ? (
            <Tooltip
              permanent
              direction="bottom"
              offset={[0, 4]}
              className="ride-name-label"
            >
              <span style={{ fontSize: 10, whiteSpace: 'nowrap', color: '#374151' }}>
                {ride.ride_name}
              </span>
            </Tooltip>
          ) : (
            <Tooltip direction="top" offset={[0, -8]}>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700 }}>{ride.ride_name}</div>
                <div>{ride.is_open ? `待ち時間: ${ride.wait_time}分` : '休止中'}</div>
                {ride.land_name && (
                  <div style={{ color: '#6b7280' }}>{ride.land_name}</div>
                )}
              </div>
            </Tooltip>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
