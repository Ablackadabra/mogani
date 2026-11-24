import { GeoLocation } from '../types';

export interface DistrictEntry {
  name: string;
  coords: { lat: number; lng: number };
  sectors: string[];
}

export interface ProvinceEntry {
  name: string;
  nameRw: string;
  districts: DistrictEntry[];
}

export const COUNTRIES = [
  'Rwanda',
  'Uganda',
  'Kenya',
  'Tanzania',
  'Burundi',
  'DR Congo',
  'International / Other',
];

export const RWANDA_PROVINCES: ProvinceEntry[] = [
  {
    name: 'Kigali City',
    nameRw: 'Umujyi wa Kigali',
    districts: [
      {
        name: 'Nyarugenge',
        coords: { lat: -1.9536, lng: 30.0588 },
        sectors: [
          'Gitega',
          'Kanyinya',
          'Kigali',
          'Kimisagara',
          'Mageragere',
          'Muhima',
          'Nyakabanda',
          'Nyamirambo',
          'Nyarugenge',
          'Rwezamenyo',
        ],
      },
      {
        name: 'Gasabo',
        coords: { lat: -1.9228, lng: 30.1012 },
        sectors: [
          'Bumbogo',
          'Gatsata',
          'Gikomero',
          'Gisozi',
          'Jabana',
          'Jali',
          'Kacyiru',
          'Kimihurura',
          'Kimironko',
          'Kinyinya',
          'Ndera',
          'Nduba',
          'Remera',
          'Rusororo',
          'Rutunga',
        ],
      },
      {
        name: 'Kicukiro',
        coords: { lat: -1.9896, lng: 30.1032 },
        sectors: [
          'Gahanga',
          'Gatenga',
          'Gikondo',
          'Kagarama',
          'Kanombe',
          'Kicukiro',
          'Kigarama',
          'Masaka',
          'Niboye',
          'Nyarugunga',
        ],
      },
    ],
  },
  {
    name: 'Northern Province',
    nameRw: 'Intara y’Amajyaruguru',
    districts: [
      {
        name: 'Musanze',
        coords: { lat: -1.4998, lng: 29.6349 },
        sectors: ['Muhoza', 'Cyuve', 'Kinigi', 'Busogo', 'Kimonyi', 'Nyange', 'Shingiro'],
      },
      {
        name: 'Burera',
        coords: { lat: -1.4822, lng: 29.8245 },
        sectors: ['Cyanika', 'Rusarabuye', 'Butaro', 'Cyeru', 'Kagogo', 'Rugarama'],
      },
      {
        name: 'Gakenke',
        coords: { lat: -1.6933, lng: 29.7867 },
        sectors: ['Gakenke', 'Busengo', 'Janja', 'Kamubuga', 'Rushashi', 'Mataba'],
      },
      {
        name: 'Gicumbi',
        coords: { lat: -1.5761, lng: 30.0672 },
        sectors: ['Byumba', 'Kageyo', 'Mutete', 'Rushaki', 'Miyove', 'Shangasha'],
      },
      {
        name: 'Rulindo',
        coords: { lat: -1.7278, lng: 29.9889 },
        sectors: ['Base', 'Bushoki', 'Cyinzuzi', 'Mbogo', 'Murambi', 'Shyorongi'],
      },
    ],
  },
  {
    name: 'Southern Province',
    nameRw: 'Intara y’Amajyepfo',
    districts: [
      {
        name: 'Huye',
        coords: { lat: -2.5967, lng: 29.7394 },
        sectors: ['Ngoma', 'Tumba', 'Mukura', 'Mbazi', 'Huye', 'Rusatira', 'Simbi'],
      },
      {
        name: 'Muhanga',
        coords: { lat: -2.0846, lng: 29.7544 },
        sectors: ['Nyamabuye', 'Shyogwe', 'Cyeza', 'Kabacuzi', 'Kiyumba', 'Rugendabari'],
      },
      {
        name: 'Kamonyi',
        coords: { lat: -2.0125, lng: 29.8981 },
        sectors: ['Runda', 'Gacurabwenge', 'Mugina', 'Musambira', 'Ngamba', 'Rukoma'],
      },
      {
        name: 'Nyanza',
        coords: { lat: -2.3519, lng: 29.7506 },
        sectors: ['Busasamana', 'Kigoma', 'Mukingo', 'Muyira', 'Ntyazo', 'Rwabicuma'],
      },
      {
        name: 'Ruhango',
        coords: { lat: -2.2308, lng: 29.7836 },
        sectors: ['Ruhango', 'Byimana', 'Kabagari', 'Kinazi', 'Kinihira', 'Mwendo'],
      },
      {
        name: 'Gisagara',
        coords: { lat: -2.6203, lng: 29.8397 },
        sectors: ['Ndora', 'Save', 'Muganza', 'Gikonko', 'Kansi', 'Mamba'],
      },
      {
        name: 'Nyamagabe',
        coords: { lat: -2.4731, lng: 29.5678 },
        sectors: ['Gasaka', 'Tare', 'Cyanika', 'Kaduha', 'Kitabi', 'Uwinkingi'],
      },
      {
        name: 'Nyaruguru',
        coords: { lat: -2.6889, lng: 29.5222 },
        sectors: ['Kibeho', 'Cyahinda', 'Mata', 'Munini', 'Ngera', 'Rusenge'],
      },
    ],
  },
  {
    name: 'Eastern Province',
    nameRw: 'Intara y’Iburasirazuba',
    districts: [
      {
        name: 'Rwamagana',
        coords: { lat: -1.9486, lng: 30.4347 },
        sectors: ['Kigabiro', 'Muhazi', 'Mwulire', 'Karenge', 'Munyaga', 'Nzige'],
      },
      {
        name: 'Kayonza',
        coords: { lat: -1.8944, lng: 30.5172 },
        sectors: ['Mukarange', 'Kabare', 'Kabarondo', 'Murama', 'Ndego', 'Rukara'],
      },
      {
        name: 'Nyagatare',
        coords: { lat: -1.2969, lng: 30.3264 },
        sectors: ['Nyagatare', 'Karangazi', 'Matimba', 'Mimuli', 'Rwempasha', 'Tabagwe'],
      },
      {
        name: 'Gatsibo',
        coords: { lat: -1.6167, lng: 30.45 },
        sectors: ['Kabarore', 'Kiramuruzi', 'Gatsibo', 'Gitoki', 'Muhura', 'Ngarama'],
      },
      {
        name: 'Bugesera',
        coords: { lat: -2.2306, lng: 30.1419 },
        sectors: ['Nyamata', 'Mayange', 'Ntarama', 'Rilima', 'Juru', 'Mwogo'],
      },
      {
        name: 'Ngoma',
        coords: { lat: -2.1642, lng: 30.5419 },
        sectors: ['Kibungo', 'Mugesera', 'Mutenderi', 'Rukira', 'Sake', 'Zaza'],
      },
      {
        name: 'Kirehe',
        coords: { lat: -2.2669, lng: 30.6544 },
        sectors: ['Kirehe', 'Gahara', 'Kigarama', 'Mahama', 'Mpanga', 'Nyamugari'],
      },
    ],
  },
  {
    name: 'Western Province',
    nameRw: 'Intara y’Iburengerazuba',
    districts: [
      {
        name: 'Rubavu',
        coords: { lat: -1.6778, lng: 29.2614 },
        sectors: ['Gisenyi', 'Nyamyumba', 'Rubavu', 'Rugerero', 'Kanama', 'Nyakiriba'],
      },
      {
        name: 'Rusizi',
        coords: { lat: -2.4847, lng: 28.9078 },
        sectors: ['Kamembe', 'Gihundwe', 'Bugarama', 'Giheke', 'Mururu', 'Nkanka'],
      },
      {
        name: 'Karongi',
        coords: { lat: -2.0619, lng: 29.3478 },
        sectors: ['Bwishyura', 'Rubengera', 'Gashari', 'Mubuga', 'Murambi', 'Rugabano'],
      },
      {
        name: 'Nyabihu',
        coords: { lat: -1.6514, lng: 29.5069 },
        sectors: ['Mukamira', 'Bigogwe', 'Jenda', 'Kabatwa', 'Rambura', 'Shyira'],
      },
      {
        name: 'Ngororero',
        coords: { lat: -1.8744, lng: 29.6228 },
        sectors: ['Ngororero', 'Kabaya', 'Hindiro', 'Kageyo', 'Muhororo', 'Sovu'],
      },
      {
        name: 'Rutsiro',
        coords: { lat: -1.9469, lng: 29.3278 },
        sectors: ['Gihango', 'Boneza', 'Kivumu', 'Mushonyi', 'Nyabirasi', 'Rusebeya'],
      },
      {
        name: 'Nyamasheke',
        coords: { lat: -2.3508, lng: 29.1069 },
        sectors: ['Kagano', 'Kanjongo', 'Bushekeri', 'Gihombo', 'Macuba', 'Shangi'],
      },
    ],
  },
];

export interface RwandaHubPoint {
  name: string;
  province: string;
  lat: number;
  lng: number;
}

export const RWANDA_MAP_HUBS: RwandaHubPoint[] = RWANDA_PROVINCES.flatMap((p) =>
  p.districts.map((d) => ({
    name: d.name,
    province: p.name,
    lat: d.coords.lat,
    lng: d.coords.lng,
  }))
);

const PROVINCE_CENTER_COORDS: Record<string, { lat: number; lng: number }> = {
  'kigali city': { lat: -1.9441, lng: 30.0619 },
  'umujyi wa kigali': { lat: -1.9441, lng: 30.0619 },
  kigali: { lat: -1.9441, lng: 30.0619 },
  'northern province': { lat: -1.585, lng: 29.82 },
  "intara y'amajyaruguru": { lat: -1.585, lng: 29.82 },
  'intara y’amajyaruguru': { lat: -1.585, lng: 29.82 },
  amajyaruguru: { lat: -1.585, lng: 29.82 },
  'southern province': { lat: -2.35, lng: 29.74 },
  "intara y'amajyepfo": { lat: -2.35, lng: 29.74 },
  'intara y’amajyepfo': { lat: -2.35, lng: 29.74 },
  amajyepfo: { lat: -2.35, lng: 29.74 },
  'eastern province': { lat: -1.95, lng: 30.45 },
  "intara y'iburasirazuba": { lat: -1.95, lng: 30.45 },
  'intara y’iburasirazuba': { lat: -1.95, lng: 30.45 },
  iburasirazuba: { lat: -1.95, lng: 30.45 },
  'western province': { lat: -2.06, lng: 29.33 },
  "intara y'iburengerazuba": { lat: -2.06, lng: 29.33 },
  'intara y’iburengerazuba': { lat: -2.06, lng: 29.33 },
  iburengerazuba: { lat: -2.06, lng: 29.33 },
};

function smallDeterministicOffset(seedText: string): { dLat: number; dLng: number } {
  if (!seedText.trim()) return { dLat: 0, dLng: 0 };
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) | 0;
  }
  const angle = ((hash & 0xffff) / 0xffff) * Math.PI * 2;
  const radius = 0.012 + (((hash >>> 16) & 0xff) / 255) * 0.022;
  return {
    dLat: Number((Math.sin(angle) * radius).toFixed(5)),
    dLng: Number((Math.cos(angle) * radius).toFixed(5)),
  };
}

export function resolveRwandaLocation(
  country: string,
  province: string,
  district: string,
  sector: string,
  cell: string,
  village: string,
  details = ''
): { formattedAddress: string; coords: GeoLocation } {
  const parts = [details, village, cell, sector, district, province, country]
    .map((s) => s.trim())
    .filter(Boolean);
  const label = parts.join(', ') || country || 'Rwanda';

  if (country && country.toLowerCase() !== 'rwanda') {
    return {
      formattedAddress: label,
      coords: { lat: -1.9441, lng: 30.0619, label },
    };
  }

  const combined = `${province} ${district} ${sector} ${cell} ${village}`.toLowerCase();

  let baseLat = -1.9441;
  let baseLng = 30.0619;
  let matched = false;

  // Match any district name across all 30 Rwanda districts
  for (const p of RWANDA_PROVINCES) {
    for (const d of p.districts) {
      if (
        district.trim().toLowerCase() === d.name.toLowerCase() ||
        combined.includes(d.name.toLowerCase()) ||
        d.sectors.some((s) => s.toLowerCase() === sector.trim().toLowerCase())
      ) {
        baseLat = d.coords.lat;
        baseLng = d.coords.lng;
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  // Fallback to Province center if District wasn't recognized
  if (!matched) {
    const provLower = province.trim().toLowerCase();
    for (const [key, coords] of Object.entries(PROVINCE_CENTER_COORDS)) {
      if (provLower.includes(key) || combined.includes(key)) {
        baseLat = coords.lat;
        baseLng = coords.lng;
        matched = true;
        break;
      }
    }
  }

  const subLocality = [sector, cell, village, details].filter((s) => s.trim().length > 0).join('|');
  const offset = smallDeterministicOffset(subLocality);

  return {
    formattedAddress: label,
    coords: {
      lat: Number((baseLat + offset.dLat).toFixed(5)),
      lng: Number((baseLng + offset.dLng).toFixed(5)),
      label,
    },
  };
}

