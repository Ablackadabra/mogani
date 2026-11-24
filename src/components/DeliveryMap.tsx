import { useMemo, useState } from 'react';
import { Navigation, MapPin, Truck, LocateFixed } from 'lucide-react';
import { GeoLocation, Language, Product } from '../types';
import { getCopy } from '../i18n';
import { formatRwf } from '../utils/image';
import { RWANDA_MAP_HUBS } from '../data/rwandaLocations';

export const KIGALI_ZONES: GeoLocation[] = [
  { lat: -1.9441, lng: 30.0619, label: 'Kigali City Center (Nyarugenge)' },
  { lat: -1.9578, lng: 30.1079, label: 'Remera / Giporoso, Kigali' },
  { lat: -1.9441, lng: 30.126, label: 'Kimironko, Kigali' },
  { lat: -1.9765, lng: 30.0445, label: 'Nyamirambo, Kigali' },
  { lat: -1.9228, lng: 30.0606, label: 'Gisozi, Kigali' },
  { lat: -1.9369, lng: 30.0888, label: 'Kacyiru, Kigali' },
  { lat: -1.9912, lng: 30.1032, label: 'Kicukiro Centre, Kigali' },
  { lat: -1.9698, lng: 30.1391, label: 'Kanombe, Kigali' },
];

export const RWANDA_QUICK_ZONES: GeoLocation[] = [
  ...KIGALI_ZONES,
  { lat: -1.4998, lng: 29.6349, label: 'Musanze, Northern Province' },
  { lat: -2.5967, lng: 29.7394, label: 'Huye, Southern Province' },
  { lat: -2.0846, lng: 29.7544, label: 'Muhanga, Southern Province' },
  { lat: -1.9486, lng: 30.4347, label: 'Rwamagana, Eastern Province' },
  { lat: -1.2969, lng: 30.3264, label: 'Nyagatare, Eastern Province' },
  { lat: -1.8944, lng: 30.5172, label: 'Kayonza, Eastern Province' },
  { lat: -2.2306, lng: 30.1419, label: 'Bugesera (Nyamata), Eastern Province' },
  { lat: -1.6778, lng: 29.2614, label: 'Rubavu (Gisenyi), Western Province' },
  { lat: -2.4847, lng: 28.9078, label: 'Rusizi (Kamembe), Western Province' },
  { lat: -2.0619, lng: 29.3478, label: 'Karongi, Western Province' },
];

export function haversineKm(a: GeoLocation, b: GeoLocation): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

interface DeliveryMapProps {
  lang: Language;
  origin: GeoLocation;
  workshopName: string;
  buyerLocation: GeoLocation;
  onBuyerLocationChange: (loc: GeoLocation) => void;
  driverCoords?: GeoLocation;
  driverLabel?: string;
  driverUpdatedAt?: string;
  compact?: boolean;
  products?: Product[];
  selectedProductId?: string;
  onSelectProductId?: (id: string) => void;
  destinationLabel?: string;
}

export function DeliveryMap({
  lang,
  origin,
  workshopName,
  buyerLocation,
  onBuyerLocationChange,
  driverCoords,
  driverLabel,
  driverUpdatedAt,
  compact = false,
  products,
  selectedProductId,
  onSelectProductId,
  destinationLabel,
}: DeliveryMapProps) {
  const t = getCopy(lang);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'error'>('idle');
  const [gpsError, setGpsError] = useState('');

  const distanceKm = useMemo(
    () => haversineKm(origin, buyerLocation),
    [origin, buyerLocation]
  );
  const etaMinutes = Math.max(12, Math.round(distanceKm * 1.8 + 10));
  const transportEstimateRwf = Math.max(5000, Math.round((distanceKm * 1100 + 3000) / 500) * 500);

  const driverRemainingKm = useMemo(
    () => (driverCoords ? haversineKm(driverCoords, buyerLocation) : null),
    [driverCoords, buyerLocation]
  );

  // Detect whether points extend outside Kigali to switch between Kigali detail view and full Rwanda national view
  const isNationwideScope = useMemo(() => {
    const points = [origin, buyerLocation, ...(driverCoords ? [driverCoords] : [])];
    return points.some(
      (pt) => pt.lat < -2.04 || pt.lat > -1.89 || pt.lng < 29.99 || pt.lng > 30.18
    );
  }, [origin, buyerLocation, driverCoords]);

  const bounds = useMemo(() => {
    if (isNationwideScope) {
      const lats = [origin.lat, buyerLocation.lat, -1.15, -2.78];
      const lngs = [origin.lng, buyerLocation.lng, 28.88, 30.82];
      if (driverCoords) {
        lats.push(driverCoords.lat);
        lngs.push(driverCoords.lng);
      }
      return {
        minLat: Math.min(...lats) - 0.08,
        maxLat: Math.max(...lats) + 0.08,
        minLng: Math.min(...lngs) - 0.1,
        maxLng: Math.max(...lngs) + 0.1,
      };
    }
    const lats = [origin.lat, buyerLocation.lat, -1.915, -2.0];
    const lngs = [origin.lng, buyerLocation.lng, 30.03, 30.15];
    if (driverCoords) {
      lats.push(driverCoords.lat);
      lngs.push(driverCoords.lng);
    }
    return {
      minLat: Math.min(...lats) - 0.015,
      maxLat: Math.max(...lats) + 0.015,
      minLng: Math.min(...lngs) - 0.018,
      maxLng: Math.max(...lngs) + 0.018,
    };
  }, [origin, buyerLocation, driverCoords, isNationwideScope]);

  const project = (pt: { lat: number; lng: number }) => {
    const x = ((pt.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 640;
    const y = (1 - (pt.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 320;
    return {
      x: Math.max(28, Math.min(612, x)),
      y: Math.max(28, Math.min(292, y)),
    };
  };

  const originPt = project(origin);
  const destPt = project(buyerLocation);
  const driverPt = driverCoords ? project(driverCoords) : null;
  const midX = (originPt.x + destPt.x) / 2;
  const midY = Math.min(originPt.y, destPt.y) - 34;

  const visibleLandmarks = useMemo(() => {
    if (!isNationwideScope) {
      return KIGALI_ZONES.map((z) => ({
        label: z.label.split(',')[0].split(' (')[0],
        lat: z.lat,
        lng: z.lng,
      }));
    }
    const majorDistricts = new Set([
      'Nyarugenge',
      'Musanze',
      'Gicumbi',
      'Huye',
      'Muhanga',
      'Nyanza',
      'Rwamagana',
      'Kayonza',
      'Nyagatare',
      'Bugesera',
      'Kirehe',
      'Rubavu',
      'Rusizi',
      'Karongi',
      'Ngororero',
    ]);
    return RWANDA_MAP_HUBS.filter((h) => majorDistricts.has(h.name)).map((h) => ({
      label: h.name === 'Nyarugenge' ? 'Kigali' : h.name,
      lat: h.lat,
      lng: h.lng,
    }));
  }, [isNationwideScope]);

  function handleUseGps() {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsStatus('locating');
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus('idle');
        onBuyerLocationChange({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          label: `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
        });
      },
      () => {
        setGpsStatus('error');
        setGpsError(
          lang === 'rw'
            ? 'GPS ntiyashoboye kuboneka; andika Intara/Umudugudu cyangwa ukande ku ikarita.'
            : 'GPS permission unavailable; enter your Rwanda address or click directly on the map.'
        );
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }

  function handleMapClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 640;
    const clickY = ((e.clientY - rect.top) / rect.height) * 320;
    const lng = bounds.minLng + (clickX / 640) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.minLat + (1 - clickY / 320) * (bounds.maxLat - bounds.minLat);
    onBuyerLocationChange({
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      label: `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    });
  }

  const formattedDriverTime = driverUpdatedAt
    ? new Date(driverUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const shortOrigin = origin.label.split(',')[0].slice(0, 16);
  const shortDest = buyerLocation.label.split(',')[0].slice(0, 16);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-[#E7E5E4] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#7C4D25]">
            <Navigation className="w-3.5 h-3.5" />
            <span>
              {t.mapTitle} ·{' '}
              {isNationwideScope
                ? lang === 'rw'
                  ? 'Rwanda Yose'
                  : 'All Rwanda View'
                : 'Kigali View'}
            </span>
          </div>
          {!compact && <p className="text-xs text-[#57534E]">{t.mapSubtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {products && products.length > 0 && onSelectProductId && (
            <select
              value={selectedProductId}
              onChange={(e) => onSelectProductId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] max-w-[220px]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === 'rw' ? p.titleRw : p.title} ({p.location})
                </option>
              ))}
            </select>
          )}

          <select
            value={
              RWANDA_QUICK_ZONES.find((z) => z.label === buyerLocation.label)?.label || 'custom'
            }
            onChange={(e) => {
              const found = RWANDA_QUICK_ZONES.find((z) => z.label === e.target.value);
              if (found) onBuyerLocationChange(found);
            }}
            className="px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] max-w-[240px]"
          >
            <option value="custom" disabled>
              {buyerLocation.label}
            </option>
            {RWANDA_QUICK_ZONES.map((z) => (
              <option key={z.label} value={z.label}>
                {z.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleUseGps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1C1917] rounded-md hover:bg-[#332E2A] transition-colors cursor-pointer whitespace-nowrap"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>{gpsStatus === 'locating' ? '...' : t.mapUseGps}</span>
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="px-4 py-2 bg-[#FFFBEB] border-b border-[#FDE68A] text-xs text-[#92400E]">
          {gpsError}
        </div>
      )}

      {/* Interactive Cartographic Route Canvas */}
      <div className={`relative w-full bg-[#F5F2EB] ${compact ? 'h-56' : 'h-80 sm:h-96'}`}>
        <svg
          viewBox="0 0 640 320"
          preserveAspectRatio="xMidYMid slice"
          onClick={handleMapClick}
          className="w-full h-full cursor-crosshair select-none"
          role="img"
          aria-label="Interactive Rwanda origin, live courier, and delivery route map"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#E5E0D5"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>

          <rect width="640" height="320" fill="#F5F2EB" />
          <rect width="640" height="320" fill="url(#grid)" />

          {/* Road & Corridor Vectors */}
          <path
            d="M 40 240 Q 220 190 360 155 T 610 115"
            fill="none"
            stroke="#E2DBD0"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 140 30 Q 260 140 320 165 T 490 290"
            fill="none"
            stroke="#E2DBD0"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Rwanda District / Neighborhood Reference Landmarks */}
          {visibleLandmarks.map((zone) => {
            const pt = project(zone);
            return (
              <g key={`${zone.label}-${zone.lat}`} transform={`translate(${pt.x}, ${pt.y})`}>
                <circle r="3" fill="#A8A29E" />
                <text
                  x="6"
                  y="3"
                  fontSize="9"
                  fill="#78716C"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  {zone.label}
                </text>
              </g>
            );
          })}

          {/* Curved Delivery Route Arc */}
          <path
            d={`M ${originPt.x} ${originPt.y} Q ${midX} ${midY} ${destPt.x} ${destPt.y}`}
            fill="none"
            stroke="#7C4D25"
            strokeWidth="3"
            strokeDasharray="6 5"
          />

          {/* Active Courier Route Leg if driver location shared */}
          {driverPt && (
            <path
              d={`M ${originPt.x} ${originPt.y} L ${driverPt.x} ${driverPt.y} L ${destPt.x} ${destPt.y}`}
              fill="none"
              stroke="#B45309"
              strokeWidth="2.4"
              strokeOpacity="0.7"
            />
          )}

          {/* Origin Marker (Where Product Ships From) */}
          <g transform={`translate(${originPt.x}, ${originPt.y})`}>
            <circle r="11" fill="#7C4D25" fillOpacity="0.18" />
            <circle r="6" fill="#7C4D25" stroke="#FFFFFF" strokeWidth="2" />
            <rect x="-62" y="-30" width="124" height="18" rx="4" fill="#1C1917" />
            <text
              x="0"
              y="-18"
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#FFFFFF"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {lang === 'rw' ? 'Aho kiva' : 'Origin'} · {shortOrigin}
            </text>
          </g>

          {/* Live Courier / Driver Marker */}
          {driverPt && (
            <g transform={`translate(${driverPt.x}, ${driverPt.y})`}>
              <circle r="14" fill="#B45309" fillOpacity="0.22" />
              <circle r="7" fill="#B45309" stroke="#FFFFFF" strokeWidth="2" />
              <rect x="-64" y="-31" width="128" height="18" rx="4" fill="#B45309" />
              <text
                x="0"
                y="-19"
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="#FFFFFF"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {lang === 'rw' ? 'Aho kigeze' : 'Transit'} · {(driverLabel || 'En route').split(',')[0].slice(0, 14)}
              </text>
            </g>
          )}

          {/* Buyer / Customer Destination Marker */}
          <g transform={`translate(${destPt.x}, ${destPt.y})`}>
            <circle r="13" fill="#0F766E" fillOpacity="0.18" />
            <circle r="6.5" fill="#0F766E" stroke="#FFFFFF" strokeWidth="2" />
            <rect x="-58" y="12" width="116" height="18" rx="4" fill="#0F766E" />
            <text
              x="0"
              y="24"
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#FFFFFF"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {destinationLabel || (lang === 'rw' ? 'Aho kijya' : 'Dest')} · {shortDest}
            </text>
          </g>
        </svg>

        <div className="absolute bottom-2.5 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded border border-[#E7E5E4] text-[11px] text-[#57534E]">
          {lang === 'rw'
            ? 'Kanda aho ari ho hose ku ikarita cyangwa wandike Intara/Umudugudu hejuru'
            : 'Click anywhere on the map or type your exact Rwanda address above'}
        </div>
      </div>

      {/* Bottom Origin / Courier / Destination / Distance Telemetry Strip */}
      <div
        className={`grid grid-cols-1 ${
          driverCoords ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
        } divide-y sm:divide-y-0 sm:divide-x divide-[#E7E5E4] bg-[#FAF9F6] text-xs`}
      >
        <div className="p-3.5 space-y-1">
          <p className="text-[#78716C] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#7C4D25]" />
            <span>{lang === 'rw' ? 'Aho Igicuruzwa Kirimo Kuva' : t.mapOriginLocation}</span>
          </p>
          <p className="font-semibold text-[#1C1917] truncate">{workshopName}</p>
          <p className="font-mono text-[11px] text-[#57534E] break-words">
            {origin.label} ({origin.lat.toFixed(4)}, {origin.lng.toFixed(4)})
          </p>
        </div>

        {driverCoords && (
          <div className="p-3.5 space-y-1 bg-[#FFFBEB]/60">
            <p className="text-[#B45309] flex items-center gap-1.5 font-medium">
              <Truck className="w-3.5 h-3.5 text-[#B45309]" />
              <span>{lang === 'rw' ? 'Aho Kigeze Ubu (Transit)' : 'Live Courier Position'}</span>
            </p>
            <p className="font-semibold text-[#1C1917] break-words">
              {driverLabel || driverCoords.label}
            </p>
            <p className="font-mono text-[11px] text-[#57534E] tabular-nums">
              {driverRemainingKm} km remaining {formattedDriverTime ? `· ${formattedDriverTime}` : ''}
            </p>
          </div>
        )}

        <div className="p-3.5 space-y-1">
          <p className="text-[#78716C] flex items-center gap-1.5">
            <LocateFixed className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{destinationLabel || t.mapYourLocation}</span>
          </p>
          <p className="font-semibold text-[#1C1917] break-words">{buyerLocation.label}</p>
          <p className="font-mono text-[11px] text-[#57534E] tabular-nums">
            {buyerLocation.lat.toFixed(4)}, {buyerLocation.lng.toFixed(4)}
          </p>
        </div>

        <div className="p-3.5 space-y-1">
          <p className="text-[#78716C] flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-[#1C1917]" />
            <span>{t.mapDistanceLabel}</span>
          </p>
          <p className="font-mono text-sm font-semibold text-[#1C1917] tabular-nums">
            {distanceKm} km · ~{etaMinutes} min
          </p>
          <p className="font-mono text-[11px] text-[#7C4D25] tabular-nums">
            Est. Transport: {formatRwf(transportEstimateRwf)}
          </p>
        </div>
      </div>
    </div>
  );
}

