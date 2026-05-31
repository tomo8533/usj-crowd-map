'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polygon, useMap, useMapEvents } from 'react-leaflet';
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

type LatLngTuple = [number, number];

interface AreaPolygon {
  name: string;
  color: string;
  positions: LatLngTuple[];
  centroid: LatLngTuple;
}

function computeCentroid(positions: LatLngTuple[]): LatLngTuple {
  const n = positions.length;
  const [sumLat, sumLng] = positions.reduce(
    ([sl, sng], [lat, lng]) => [sl + lat, sng + lng],
    [0, 0]
  );
  return [sumLat / n, sumLng / n];
}

function createAreaLabelIcon(name: string, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<span style="position:absolute;transform:translate(-50%,-50%);font-size:11px;font-weight:700;color:${color};white-space:nowrap;pointer-events:none;user-select:none;">${name}</span>`,
  });
}

// GeoJSON座標 [lng, lat] → Leaflet [lat, lng] に変換済み
const AREA_POLYGONS: AreaPolygon[] = (
  [
    {
      name: 'スーパーニンテンドーワールド',
      color: '#E63946',
      coords: [
        [135.4297683, 34.6676974], [135.4306304, 34.6675011],
        [135.4308957, 34.6683956], [135.4310018, 34.6691646],
        [135.4311344, 34.6692246], [135.431015, 34.66953],
        [135.4291516, 34.6689628], [135.4297683, 34.6676974],
      ],
    },
    {
      name: 'ハリーポッターエリア',
      color: '#7C3AED',
      coords: [
        [135.4310967, 34.6691731], [135.4311744, 34.6692026],
        [135.4311147, 34.6693548], [135.4316938, 34.6695561],
        [135.4322312, 34.6697133], [135.4328878, 34.6682538],
        [135.4317284, 34.6675081], [135.4317723, 34.6673249],
        [135.4321459, 34.6666045], [135.4323402, 34.6666096],
        [135.432563, 34.6663021], [135.432333, 34.6661662],
        [135.4320491, 34.6663127], [135.431486, 34.6672556],
        [135.4310577, 34.6673818], [135.4308799, 34.6676876],
        [135.4310967, 34.6691731],
      ],
    },
    {
      name: 'ワンダーランド',
      color: '#EC4899',
      coords: [
        [135.432807, 34.6662954], [135.4328199, 34.6664125],
        [135.4336613, 34.6670247], [135.4345998, 34.6671365],
        [135.4346256, 34.6674825], [135.4338555, 34.6682543],
        [135.4329559, 34.6683288], [135.4328636, 34.6678351],
        [135.4319333, 34.6673441], [135.4321727, 34.6666574],
        [135.4324187, 34.6666681], [135.4326905, 34.6663061],
        [135.432807, 34.6662954],
      ],
    },
    {
      name: 'ハリウッドエリア',
      color: '#9333EA',
      coords: [
        [135.4336716, 34.6669587], [135.4346176, 34.667074],
        [135.4355725, 34.6669732], [135.4361681, 34.6674415],
        [135.4372018, 34.6668363], [135.4360542, 34.6647829],
        [135.4348279, 34.6649198], [135.4345476, 34.6647973],
        [135.433549, 34.6649126], [135.4336716, 34.6654962],
        [135.4330945, 34.6656819], [135.4327781, 34.6661302],
        [135.4328832, 34.6663968], [135.4336716, 34.6669587],
      ],
    },
    {
      name: 'ニューヨークエリア',
      color: '#6B7280',
      coords: [
        [135.4324478, 34.6641568], [135.4324245, 34.6640465],
        [135.4327217, 34.6640226], [135.4332711, 34.6639366],
        [135.4331179, 34.6631359], [135.4341552, 34.6629921],
        [135.4342251, 34.6633516], [135.4345747, 34.6633084],
        [135.4347204, 34.6640034], [135.4356061, 34.6639267],
        [135.4358683, 34.6647319], [135.4348428, 34.6648517],
        [135.4345689, 34.6647319], [135.4335015, 34.6648649],
        [135.4336115, 34.6654771], [135.4330872, 34.6656527],
        [135.432914, 34.6658343], [135.4326854, 34.6661601],
        [135.4322154, 34.6660507], [135.4321179, 34.66581],
        [135.4320807, 34.6655994], [135.4322322, 34.6655227],
        [135.432203, 34.6653023], [135.4324012, 34.6653358],
        [135.4328032, 34.6652879], [135.4329781, 34.6655611],
        [135.4330596, 34.665585], [135.433147, 34.665494],
        [135.4331063, 34.6653358], [135.4332345, 34.66524],
        [135.433182, 34.6648134], [135.4325993, 34.6644827],
        [135.4325294, 34.6641759], [135.4324478, 34.6641568],
      ],
    },
    {
      name: 'ミニオンパーク',
      color: '#EAB308',
      coords: [
        [135.4327738, 34.6639534], [135.4326523, 34.663274],
        [135.4330653, 34.6631341], [135.4330289, 34.6628543],
        [135.4328345, 34.6628643], [135.4327252, 34.6625745],
        [135.4317897, 34.6627244], [135.4318869, 34.663234],
        [135.4316683, 34.6632939], [135.4317169, 34.6638835],
        [135.4323729, 34.6638935], [135.4324336, 34.6639934],
        [135.4327738, 34.6639534],
      ],
    },
    {
      name: 'サンフランシスコエリア',
      color: '#F97316',
      coords: [
        [135.430852, 34.6640182], [135.4309881, 34.6639797],
        [135.4311795, 34.6640462], [135.4312042, 34.664485],
        [135.431678, 34.664495], [135.4315929, 34.6640254],
        [135.4318481, 34.6640254], [135.4319695, 34.6643651],
        [135.4324069, 34.6643051], [135.4323619, 34.6639167],
        [135.4316857, 34.6639063], [135.4316346, 34.6635669],
        [135.4312285, 34.6636157], [135.4312042, 34.6634758],
        [135.4308883, 34.6635358], [135.4309491, 34.6638955],
        [135.4308053, 34.6639237], [135.430852, 34.6640182],
      ],
    },
    {
      name: 'アミティ・ビレッジ',
      color: '#0EA5E9',
      coords: [
        [135.4309144, 34.6671415], [135.4315765, 34.66699],
        [135.432014, 34.6662561], [135.4322442, 34.666114],
        [135.4321589, 34.6660342], [135.4320428, 34.6657494],
        [135.4318067, 34.6655222], [135.4311102, 34.6653896],
        [135.4303906, 34.6657163], [135.4302755, 34.6662513],
        [135.4303388, 34.6665544], [135.4305748, 34.6666491],
        [135.430782, 34.6671793], [135.4309144, 34.6671415],
      ],
    },
    {
      name: 'ジュラシックパーク',
      color: '#16A34A',
      coords: [
        [135.430972, 34.6646415], [135.430949, 34.6642958],
        [135.430759, 34.6639029], [135.4306093, 34.6630979],
        [135.4304194, 34.6630411], [135.4300855, 34.6631026],
        [135.4301373, 34.6635714], [135.429884, 34.6636377],
        [135.4291011, 34.6647078], [135.429245, 34.6649019],
        [135.4286981, 34.6652665], [135.4289284, 34.6655222],
        [135.4293198, 34.6653565], [135.4294062, 34.6654559],
        [135.4297573, 34.6654369], [135.4297689, 34.665669],
        [135.4300106, 34.6657921], [135.4311447, 34.6652996],
        [135.4312541, 34.6650534], [135.4312426, 34.6649824],
        [135.4310181, 34.6647646], [135.430972, 34.6646415],
      ],
    },
    {
      name: 'ウォーターワールド',
      color: '#06B6D4',
      coords: [
        [135.4298853, 34.666459], [135.4301656, 34.6665959],
        [135.4303495, 34.6667472], [135.4303408, 34.6673956],
        [135.4297101, 34.6675613], [135.4294035, 34.6672875],
        [135.4290356, 34.6669633], [135.4291845, 34.6667976],
        [135.429675, 34.6664734], [135.4298853, 34.666459],
      ],
    },
  ] as { name: string; color: string; coords: [number, number][] }[]
).map((area) => {
  const positions = area.coords.map(([lng, lat]) => [lat, lng] as LatLngTuple);
  return {
    name: area.name,
    color: area.color,
    positions,
    centroid: computeCentroid(positions),
  };
});

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

// ズームレベルを追跡してマーカーを描画するレイヤー
function MarkersLayer({
  filteredRides,
  showLabels,
  isMobile,
}: {
  filteredRides: RideWithLocation[];
  showLabels: boolean;
  isMobile: boolean;
}) {
  const [zoom, setZoom] = useState(16);

  useMapEvents({
    zoomend(e) {
      setZoom(e.target.getZoom());
    },
  });

  // showLabels=true かつ zoom>=17 のときのみ常時表示
  const showPermanentLabels = showLabels && zoom >= 17;

  return (
    <>
      {filteredRides.map((ride) => (
        <Marker
          key={`${ride.ride_id}-${showPermanentLabels}`}
          position={[ride.lat, ride.lng]}
          icon={createBubbleIcon(ride, isMobile)}
        >
          {showPermanentLabels ? (
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
    </>
  );
}

function AreaPolygonsLayer({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <>
      {AREA_POLYGONS.map((area) => (
        <Polygon
          key={area.name}
          positions={area.positions}
          pathOptions={{
            color: area.color,
            fillColor: area.color,
            fillOpacity: 0.15,
            opacity: 0.5,
            weight: 2,
          }}
        >
          <Tooltip sticky>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{area.name}</span>
          </Tooltip>
        </Polygon>
      ))}
      {AREA_POLYGONS.map((area) => (
        <Marker
          key={`${area.name}-label`}
          position={area.centroid}
          icon={createAreaLabelIcon(area.name, area.color)}
          interactive={false}
        />
      ))}
    </>
  );
}

interface Props {
  rides: RideWithLocation[];
  focusedRideId: number | null;
  activeAreas: string[];
  offset: SimOffset;
  showLabels: boolean;
  showAreaPolygons: boolean;
  isMobile?: boolean;
}

export default function MapComponent({
  rides,
  focusedRideId,
  activeAreas,
  showLabels,
  showAreaPolygons,
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
      <AreaPolygonsLayer show={showAreaPolygons} />
      <HeatmapLayer rides={filteredRides} />
      <FlyToController focusedRideId={focusedRideId} rides={rides} />
      <ResetControl />
      <MarkersLayer
        filteredRides={filteredRides}
        showLabels={showLabels}
        isMobile={isMobile}
      />
    </MapContainer>
  );
}
