import { useEffect, useId, useState } from 'react';
import { MapPin } from 'lucide-react';
import { GeoLocation, Language } from '../types';
import {
  COUNTRIES,
  resolveRwandaLocation,
  RWANDA_PROVINCES,
} from '../data/rwandaLocations';

interface RwandaLocationPickerProps {
  lang: Language;
  title?: string;
  subtitle?: string;
  actionButtonLabel?: string;
  onLocationChange: (address: string, coords: GeoLocation) => void;
  onActionSubmit?: (address: string, coords: GeoLocation) => void;
}

export function RwandaLocationPicker({
  lang,
  title,
  subtitle,
  actionButtonLabel,
  onLocationChange,
  onActionSubmit,
}: RwandaLocationPickerProps) {
  const uid = useId();
  const [country, setCountry] = useState('Rwanda');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [cell, setCell] = useState('');
  const [village, setVillage] = useState('');
  const [details, setDetails] = useState('');

  const matchedProv = RWANDA_PROVINCES.find(
    (p) =>
      p.name.toLowerCase() === province.trim().toLowerCase() ||
      p.nameRw.toLowerCase() === province.trim().toLowerCase()
  );

  const districtSuggestions = matchedProv
    ? matchedProv.districts
    : RWANDA_PROVINCES.flatMap((p) => p.districts);

  const matchedDist = districtSuggestions.find(
    (d) => d.name.toLowerCase() === district.trim().toLowerCase()
  );

  const sectorSuggestions = matchedDist
    ? matchedDist.sectors
    : Array.from(new Set(districtSuggestions.flatMap((d) => d.sectors)));

  const resolved = resolveRwandaLocation(
    country.trim() || 'Rwanda',
    province,
    district,
    sector,
    cell,
    village,
    details
  );

  const hasUserSpecificInput = Boolean(
    province.trim() ||
      district.trim() ||
      sector.trim() ||
      cell.trim() ||
      village.trim() ||
      details.trim()
  );

  useEffect(() => {
    if (!hasUserSpecificInput) return;
    onLocationChange(resolved.formattedAddress, resolved.coords);
  }, [hasUserSpecificInput, resolved.formattedAddress, resolved.coords.lat, resolved.coords.lng]);

  return (
    <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E7E5E4] space-y-3">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#7C4D25] shrink-0" />
          <span>
            {title ||
              (lang === 'rw'
                ? 'Andika Aho Uherereye (Intara · Akarere · Umurenge · Akagari · Umudugudu · Ibindi)'
                : 'Enter Exact Location (Province · District · Sector · Cell · Village · Details)')}
          </span>
        </p>
        {subtitle && <p className="text-[11px] text-[#57534E]">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[11px] text-[#57534E] mb-1">
            {lang === 'rw' ? 'Igihugu (Country)' : 'Country'}
          </label>
          <input
            type="text"
            list={`country-${uid}`}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Rwanda"
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
          />
          <datalist id={`country-${uid}`}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-[11px] text-[#57534E] mb-1">
            {lang === 'rw' ? 'Intara (Province)' : 'Province / Region'}
          </label>
          <input
            type="text"
            list={`province-${uid}`}
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder={lang === 'rw' ? 'Urugero: Amajyepfo / Kigali' : 'e.g. Kigali City / Northern'}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
          />
          <datalist id={`province-${uid}`}>
            {RWANDA_PROVINCES.map((p) => (
              <option key={p.name} value={lang === 'rw' ? p.nameRw : p.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-[11px] text-[#57534E] mb-1">
            {lang === 'rw' ? 'Akarere (District)' : 'District'}
          </label>
          <input
            type="text"
            list={`district-${uid}`}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder={lang === 'rw' ? 'Urugero: Gasabo / Huye' : 'e.g. Gasabo / Musanze'}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
          />
          <datalist id={`district-${uid}`}>
            {districtSuggestions.map((d) => (
              <option key={d.name} value={d.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-[11px] text-[#57534E] mb-1">
            {lang === 'rw' ? 'Umurenge (Sector)' : 'Sector'}
          </label>
          <input
            type="text"
            list={`sector-${uid}`}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder={lang === 'rw' ? 'Andika umurenge wawe...' : 'Type any sector...'}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
          />
          <datalist id={`sector-${uid}`}>
            {sectorSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-[11px] text-[#57534E] mb-1">
            {lang === 'rw' ? 'Akagari (Cell)' : 'Cell'}
          </label>
          <input
            type="text"
            value={cell}
            onChange={(e) => setCell(e.target.value)}
            placeholder={lang === 'rw' ? 'Andika akagari...' : 'Type your cell...'}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[#57534E] mb-1">
            {lang === 'rw' ? 'Umudugudu (Village)' : 'Village'}
          </label>
          <input
            type="text"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            placeholder={lang === 'rw' ? 'Andika umudugudu...' : 'Type your village...'}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
          />
        </div>

        <div className="col-span-2 sm:col-span-3">
          <label className="block text-[11px] text-[#57534E] mb-1">
            {lang === 'rw'
              ? 'Ibindi Bisobanuro (Umuhanda, Numero y’Inzu cyangwa Aho Wegereye)'
              : 'Additional Details (Street, House No., Landmark)'}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                lang === 'rw'
                  ? 'Urugero: KN 14 Ave, Hafi y’isoko cyangwa kuri gare...'
                  : 'e.g. Street KK 12, near main market / gate color...'
              }
              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
            />
            {actionButtonLabel && onActionSubmit && (
              <button
                type="button"
                onClick={() => onActionSubmit(resolved.formattedAddress, resolved.coords)}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {actionButtonLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#57534E] font-mono truncate">
        {lang === 'rw' ? 'Aderesi yatoranyijwe:' : 'Resolved Address:'} {resolved.formattedAddress}
      </p>
    </div>
  );
}
