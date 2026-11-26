import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getStore } from '@netlify/blobs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function isRunningOnNetlify(): boolean {
  return Boolean(
    process.env.NETLIFY === 'true' ||
      process.env.NETLIFY_BLOBS_CONTEXT ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
  );
}

const LOCAL_DATA_DIR = path.resolve(ROOT_DIR, 'data');
const TMP_DATA_DIR = path.resolve('/tmp', 'jokeve-data');
const BUNDLED_STORE_CANDIDATES = [
  path.resolve(process.cwd(), 'data', 'store.json'),
  path.resolve(__dirname, 'data', 'store.json'),
  path.resolve(ROOT_DIR, 'data', 'store.json'),
];
const BUNDLED_STORE_PATH =
  BUNDLED_STORE_CANDIDATES.find((p) => fs.existsSync(p)) ||
  path.resolve(LOCAL_DATA_DIR, 'store.json');

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string;
}

export type ProductCategory =
  | 'sofas'
  | 'dining'
  | 'accent'
  | 'office'
  | 'wardrobes'
  | 'beds'
  | 'rentals';

export interface UserPermissions {
  canPostProducts: boolean;
  canPostAds: boolean;
  canSendChat: boolean;
  canPlaceOrders: boolean;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'buyer' | 'seller' | 'admin';
  status: 'active' | 'suspended';
  avatarUrl?: string;
  workshopName?: string;
  location?: string;
  momoCode?: string;
  bankAccount?: string;
  permissions?: Partial<UserPermissions>;
  tokenVersion?: number;
  lastLoginAt?: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

export interface StoredProduct {
  id: string;
  sellerId: string;
  sellerName: string;
  workshopName: string;
  location: string;
  originCoords: GeoLocation;
  title: string;
  titleRw: string;
  category: ProductCategory;
  listingMode: 'sale' | 'rent' | 'both';
  priceRwf: number;
  rentalPricePerDayRwf?: number;
  material: string;
  dimensions: string;
  leadTimeDays: number;
  description: string;
  descriptionRw: string;
  imageUrl: string;
  momoCode: string;
  phone: string;
  bankAccount: string;
  createdAt: string;
}

export interface StoredOrder {
  id: string;
  orderType: 'purchase' | 'custom' | 'repair' | 'rent';
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  sellerId: string;
  sellerName: string;
  workshopName: string;
  productId?: string;
  productTitle: string;
  referenceImageUrl: string;
  uploadedPhotoUrl?: string;
  fabricChoice?: string;
  dimensions?: string;
  repairType?: string;
  rentalDays?: number;
  rentalQuantity?: number;
  notes: string;
  deliveryAddress: string;
  buyerCoords?: GeoLocation;
  originCoords?: GeoLocation;
  driverCoords?: GeoLocation;
  driverLocationLabel?: string;
  driverUpdatedAt?: string;
  distanceKm?: number;
  agreedPriceRwf: number;
  paymentMethod: 'momo_code' | 'phone' | 'bank' | 'cod';
  paymentRef: string;
  status: 'pending' | 'confirmed' | 'in_craft' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface StoredConversation {
  id: string;
  productId?: string;
  productTitle: string;
  productImageUrl: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  workshopName: string;
  lastMessage: string;
  lastMessageAt: string;
  negotiatedPriceRwf?: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  senderAvatarUrl?: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  offerPriceRwf?: number;
  createdAt: string;
}

export interface AdminCredential {
  email: string;
  passwordSalt: string;
  passwordHash: string;
  claimedAt: string;
}

export interface SiteSettings {
  platformName: string;
  adminEmail: string;
  defaultMomoCode: string;
  defaultBankAccount: string;
  supportPhone: string;
  adBannerTitle?: string;
  adBannerText?: string;
}

export interface StoredAdVideo {
  id: string;
  sellerId: string;
  sellerName: string;
  workshopName: string;
  title: string;
  caption: string;
  ctaLabel: string;
  productId?: string;
  mediaType?: 'video' | 'slideshow';
  displaySize?: 'standard' | 'big';
  videoUrl?: string;
  posterImageUrl: string;
  slideshowImages?: string[];
  slideIntervalMs?: number;
  durationSec?: number;
  appName?: string;
  appUrl?: string;
  status: 'active' | 'paused';
  views: number;
  createdAt: string;
}

export interface StoreData {
  users: StoredUser[];
  products: StoredProduct[];
  orders: StoredOrder[];
  conversations: StoredConversation[];
  messages: StoredMessage[];
  ads: StoredAdVideo[];
  wishlists: Record<string, string[]>;
  productLikes?: Record<string, string[]>;
  sessionSecret?: string;
  adminCredential?: AdminCredential;
  settings: SiteSettings;
}

interface AuthenticatedRequest extends Request {
  user?: StoredUser;
}

const VALID_CATEGORIES: ProductCategory[] = [
  'sofas',
  'dining',
  'accent',
  'office',
  'wardrobes',
  'beds',
  'rentals',
];

const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

const LOCATION_COORDS: Record<string, GeoLocation> = {
  nyamirambo: { lat: -1.9765, lng: 30.0445, label: 'Nyamirambo, Kigali' },
  gisozi: { lat: -1.9228, lng: 30.0606, label: 'Gisozi, Kigali' },
  kimironko: { lat: -1.9441, lng: 30.126, label: 'Kimironko, Kigali' },
  remera: { lat: -1.9578, lng: 30.1079, label: 'Remera, Kigali' },
  kacyiru: { lat: -1.9369, lng: 30.0888, label: 'Kacyiru, Kigali' },
  kicukiro: { lat: -1.9912, lng: 30.1032, label: 'Kicukiro, Kigali' },
  kanombe: { lat: -1.9698, lng: 30.1391, label: 'Kanombe, Kigali' },
  nyarugenge: { lat: -1.9536, lng: 30.0588, label: 'Nyarugenge, Kigali' },
  gasabo: { lat: -1.9228, lng: 30.1012, label: 'Gasabo, Kigali' },
  musanze: { lat: -1.4998, lng: 29.6349, label: 'Musanze, Northern Province' },
  burera: { lat: -1.4822, lng: 29.8245, label: 'Burera, Northern Province' },
  gakenke: { lat: -1.6933, lng: 29.7867, label: 'Gakenke, Northern Province' },
  gicumbi: { lat: -1.5761, lng: 30.0672, label: 'Gicumbi, Northern Province' },
  rulindo: { lat: -1.7278, lng: 29.9889, label: 'Rulindo, Northern Province' },
  huye: { lat: -2.5967, lng: 29.7394, label: 'Huye, Southern Province' },
  muhanga: { lat: -2.0846, lng: 29.7544, label: 'Muhanga, Southern Province' },
  kamonyi: { lat: -2.0125, lng: 29.8981, label: 'Kamonyi, Southern Province' },
  nyanza: { lat: -2.3519, lng: 29.7506, label: 'Nyanza, Southern Province' },
  ruhango: { lat: -2.2308, lng: 29.7836, label: 'Ruhango, Southern Province' },
  gisagara: { lat: -2.6203, lng: 29.8397, label: 'Gisagara, Southern Province' },
  nyamagabe: { lat: -2.4731, lng: 29.5678, label: 'Nyamagabe, Southern Province' },
  nyaruguru: { lat: -2.6889, lng: 29.5222, label: 'Nyaruguru, Southern Province' },
  rwamagana: { lat: -1.9486, lng: 30.4347, label: 'Rwamagana, Eastern Province' },
  kayonza: { lat: -1.8944, lng: 30.5172, label: 'Kayonza, Eastern Province' },
  nyagatare: { lat: -1.2969, lng: 30.3264, label: 'Nyagatare, Eastern Province' },
  gatsibo: { lat: -1.6167, lng: 30.45, label: 'Gatsibo, Eastern Province' },
  bugesera: { lat: -2.2306, lng: 30.1419, label: 'Bugesera, Eastern Province' },
  ngoma: { lat: -2.1642, lng: 30.5419, label: 'Ngoma, Eastern Province' },
  kirehe: { lat: -2.2669, lng: 30.6544, label: 'Kirehe, Eastern Province' },
  rubavu: { lat: -1.6778, lng: 29.2614, label: 'Rubavu, Western Province' },
  rusizi: { lat: -2.4847, lng: 28.9078, label: 'Rusizi, Western Province' },
  karongi: { lat: -2.0619, lng: 29.3478, label: 'Karongi, Western Province' },
  nyabihu: { lat: -1.6514, lng: 29.5069, label: 'Nyabihu, Western Province' },
  ngororero: { lat: -1.8744, lng: 29.6228, label: 'Ngororero, Western Province' },
  rutsiro: { lat: -1.9469, lng: 29.3278, label: 'Rutsiro, Western Province' },
  nyamasheke: { lat: -2.3508, lng: 29.1069, label: 'Nyamasheke, Western Province' },
  amajyaruguru: { lat: -1.585, lng: 29.82, label: 'Northern Province' },
  northern: { lat: -1.585, lng: 29.82, label: 'Northern Province' },
  amajyepfo: { lat: -2.35, lng: 29.74, label: 'Southern Province' },
  southern: { lat: -2.35, lng: 29.74, label: 'Southern Province' },
  iburasirazuba: { lat: -1.95, lng: 30.45, label: 'Eastern Province' },
  eastern: { lat: -1.95, lng: 30.45, label: 'Eastern Province' },
  iburengerazuba: { lat: -2.06, lng: 29.33, label: 'Western Province' },
  western: { lat: -2.06, lng: 29.33, label: 'Western Province' },
  kigali: { lat: -1.9441, lng: 30.0619, label: 'Kigali City Center' },
};

function getDesignatedAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'ablackadabla@gmail.com').trim().toLowerCase();
}

function getEnvSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || '';
}

function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function resolveCoordsForLocation(loc: string): GeoLocation {
  const lower = loc.toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (lower.includes(key)) {
      return { ...coords, label: loc || coords.label };
    }
  }
  return { lat: -1.9441, lng: 30.0619, label: loc || 'Kigali, Rwanda' };
}

function sanitizeGeoLocation(raw: unknown): GeoLocation | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const lat = Number(obj.lat);
  const lng = Number(obj.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return undefined;
  }
  const label = cleanStr(obj.label, 200) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)), label };
}

function getDefaultSettings(): SiteSettings {
  return {
    platformName: 'JOKEVE FURNITURE',
    adminEmail: getDesignatedAdminEmail(),
    defaultMomoCode: '*182*8*1*448210#',
    defaultBankAccount: 'BK · 00040-0692145-18',
    supportPhone: '+250 788 412 890',
    adBannerTitle: '',
    adBannerText: '',
  };
}

const DEFAULT_PRODUCTS: StoredProduct[] = [
  {
    id: 'prod-kigali-boucle-sofa',
    sellerId: 'workshop-nyamirambo-craft',
    sellerName: 'Jean-Paul Habimana',
    workshopName: 'Nyamirambo Heritage Woodwork',
    location: 'Nyamirambo, Kigali',
    originCoords: LOCATION_COORDS.nyamirambo,
    title: 'Kigali Three-Seater Boucle Sofa',
    titleRw: 'Intebe za Salon z’Abantu Batatu (Boucle & Oak)',
    category: 'sofas',
    listingMode: 'sale',
    priceRwf: 680000,
    material: 'Kiln-dried Oak & Cream Boucle',
    dimensions: '220 × 92 × 78 cm',
    leadTimeDays: 7,
    description:
      'Hand-built solid oak plinth sofa upholstered in heavy stain-resistant cream boucle with high-resilience cushions.',
    descriptionRw:
      'Intebe zikoranye ubuhanga mu giti cy’umwimerere na boucle idacuya, zifite imisego ikomeye kandi yoroshye kwicara.',
    imageUrl: '/src/assets/images/sofa_boucle_nordic_1795425663358.jpg',
    momoCode: '*182*8*1*448210#',
    phone: '+250 788 412 890',
    bankAccount: 'BK · 00040-0692145-18',
    createdAt: '2026-11-18T08:30:00.000Z',
  },
  {
    id: 'prod-emerald-velvet-lounge',
    sellerId: 'workshop-gisozi-atelier',
    sellerName: 'Clarisse Uwase',
    workshopName: 'Gisozi Atelier Interiors',
    location: 'Gisozi, Kigali',
    originCoords: LOCATION_COORDS.gisozi,
    title: 'Moss Velvet Sculpted Lounge Chair',
    titleRw: 'Intebe yo Kuruhukiramo ya Velvet n’Umuvumu',
    category: 'accent',
    listingMode: 'both',
    priceRwf: 245000,
    rentalPricePerDayRwf: 12000,
    material: 'Carved Walnut Frame & Velvet',
    dimensions: '76 × 82 × 84 cm',
    leadTimeDays: 5,
    description:
      'Ergonomic reading and salon armchair crafted with hand-shaped hardwood armrests and deep moss velvet upholstery.',
    descriptionRw:
      'Intebe imwe yo muri salon cyangwa mu cyumba cyo gusomeramo, ibajwe mu giti gikomeye igashyirwaho igitambaro cya velvet.',
    imageUrl: '/src/assets/images/chair_velvet_emerald_1795425663793.jpg',
    momoCode: '*182*8*1*512904#',
    phone: '+250 788 530 214',
    bankAccount: 'Equity · 40022-1198340-09',
    createdAt: '2026-11-19T09:15:00.000Z',
  },
  {
    id: 'prod-walnut-dining-ensemble',
    sellerId: 'workshop-nyamirambo-craft',
    sellerName: 'Jean-Paul Habimana',
    workshopName: 'Nyamirambo Heritage Woodwork',
    location: 'Nyamirambo, Kigali',
    originCoords: LOCATION_COORDS.nyamirambo,
    title: 'Six-Seat Walnut & Cane Dining Set',
    titleRw: 'Ameza yo Kuriraho n’Intebe 6 za Rattan',
    category: 'dining',
    listingMode: 'sale',
    priceRwf: 890000,
    material: 'Solid Walnut, Oak & Woven Cane',
    dimensions: '200 × 95 × 76 cm',
    leadTimeDays: 10,
    description:
      'Complete architectural dining table for six paired with breathable woven cane backrests and linen-padded seats.',
    descriptionRw:
      'Ameza manini y’umuryango hamwe n’intebe esheshatu zifite imigongo iboshye mu buryo bugezweho n’imisego yoroshye.',
    imageUrl: '/src/assets/images/dining_set_walnut_1795425663356.jpg',
    momoCode: '*182*8*1*448210#',
    phone: '+250 788 412 890',
    bankAccount: 'BK · 00040-0692145-18',
    createdAt: '2026-11-20T11:00:00.000Z',
  },
  {
    id: 'prod-saddle-leather-study',
    sellerId: 'workshop-kimironko-seating',
    sellerName: 'Eric Ndayisenga',
    workshopName: 'Kimironko Fine Seating',
    location: 'Kimironko, Kigali',
    originCoords: LOCATION_COORDS.kimironko,
    title: 'Saddle Leather Executive Armchair',
    titleRw: 'Intebe y’Uruhuguriro n’Ibiro (Full-Grain Leather)',
    category: 'office',
    listingMode: 'sale',
    priceRwf: 340000,
    material: 'Full-Grain Saddle Leather & Walnut',
    dimensions: '80 × 84 × 88 cm',
    leadTimeDays: 6,
    description:
      'Tailored full-grain saddle leather chair with scrolled walnut trim, built for executive offices and home libraries.',
    descriptionRw:
      'Intebe y’uruhu rw’umwimerere ikoze neza cyane, ibereye ibiro byiyubashye cyangwa aho kuruhukira mu rugo.',
    imageUrl: '/src/assets/images/chair_executive_leather_1795425662984.jpg',
    momoCode: '*182*8*1*663812#',
    phone: '+250 783 901 445',
    bankAccount: 'I&M · 20010-8834210-12',
    createdAt: '2026-11-21T14:20:00.000Z',
  },
  {
    id: 'prod-walnut-wardrobe-cabinet',
    sellerId: 'workshop-nyamirambo-craft',
    sellerName: 'Jean-Paul Habimana',
    workshopName: 'Nyamirambo Heritage Woodwork',
    location: 'Nyamirambo, Kigali',
    originCoords: LOCATION_COORDS.nyamirambo,
    title: 'Solid Walnut Wardrobe & Slatted Oak Cabinet',
    titleRw: 'Garde-robe y’Igiti cy’Umwimerere & Akabati k’Imyenda',
    category: 'wardrobes',
    listingMode: 'sale',
    priceRwf: 740000,
    material: 'Solid Walnut, Oak & Brass Hardware',
    dimensions: '180 × 60 × 215 cm',
    leadTimeDays: 9,
    description:
      'Two-door solid walnut garde-robe wardrobe paired with a ventilated slatted oak storage cabinet, finished with brass handles.',
    descriptionRw:
      'Garde-robe nini ikomeye y’imiryango ibiri hamwe n’akabati ko kubikamo ibikoresho mu giti cy’umwimerere n’ibifunguzo bya brass.',
    imageUrl: '/src/assets/images/wardrobe_cabinet_walnut_1795441272016.jpg',
    momoCode: '*182*8*1*448210#',
    phone: '+250 788 412 890',
    bankAccount: 'BK · 00040-0692145-18',
    createdAt: '2026-11-22T15:30:00.000Z',
  },
  {
    id: 'prod-hardwood-king-bed',
    sellerId: 'workshop-gisozi-atelier',
    sellerName: 'Clarisse Uwase',
    workshopName: 'Gisozi Atelier Interiors',
    location: 'Gisozi, Kigali',
    originCoords: LOCATION_COORDS.gisozi,
    title: 'Oak & Walnut King Platform Bed',
    titleRw: 'Igitanda cy’Igiti Gikomeye n’Umutwe wa Linen (180×200)',
    category: 'beds',
    listingMode: 'sale',
    priceRwf: 620000,
    material: 'Solid Oak, Walnut & Oatmeal Linen',
    dimensions: '180 × 200 × 112 cm',
    leadTimeDays: 8,
    description:
      'Architectural hardwood platform bed with reinforced center slats and upholstered linen headboard for quiet support.',
    descriptionRw:
      'Igitanda cyiza cy’igiti gikomeye gifite umutwe woroshye wa linen n’imbaho zikomeye zifata matela neza.',
    imageUrl: '/src/assets/images/bed_frame_hardwood_1795441272228.jpg',
    momoCode: '*182*8*1*512904#',
    phone: '+250 788 530 214',
    bankAccount: 'Equity · 40022-1198340-09',
    createdAt: '2026-11-22T17:10:00.000Z',
  },
  {
    id: 'prod-plastic-event-chairs',
    sellerId: 'workshop-kimironko-seating',
    sellerName: 'Eric Ndayisenga',
    workshopName: 'Kimironko Fine Seating',
    location: 'Kimironko, Kigali',
    originCoords: LOCATION_COORDS.kimironko,
    title: 'Stackable Event Plastic Chairs (Sale & Rental)',
    titleRw: 'Intebe za Plastiki z’Ibirori (Kugura cyangwa Gukodesha)',
    category: 'rentals',
    listingMode: 'both',
    priceRwf: 18500,
    rentalPricePerDayRwf: 1500,
    material: 'UV-Stabilized Molded Polymer & Steel',
    dimensions: '46 × 50 × 81 cm',
    leadTimeDays: 1,
    description:
      'Durable stackable molded plastic chairs and folding banquet chairs available per piece to buy or rent daily for weddings and events.',
    descriptionRw:
      'Intebe za plastiki zikomeye zishobora kugerekeranywa, ziboneka zo kugura cyangwa gukodesha ku munsi mu bukwe, inama n’ibirori.',
    imageUrl: '/src/assets/images/rental_event_chairs_1795441271646.jpg',
    momoCode: '*182*8*1*663812#',
    phone: '+250 783 901 445',
    bankAccount: 'I&M · 20010-8834210-12',
    createdAt: '2026-11-23T04:00:00.000Z',
  },
  {
    id: 'prod-atelier-living-suite',
    sellerId: 'workshop-gisozi-atelier',
    sellerName: 'Clarisse Uwase',
    workshopName: 'Gisozi Atelier Interiors',
    location: 'Gisozi, Kigali',
    originCoords: LOCATION_COORDS.gisozi,
    title: 'Walnut Frame Linen Sofa & Coffee Table',
    titleRw: 'Salon Yuzuye: Intebe ya Linen n’Ameza yo Hagati',
    category: 'sofas',
    listingMode: 'sale',
    priceRwf: 950000,
    material: 'Solid Walnut & Belgian Linen',
    dimensions: '235 × 90 × 76 cm',
    leadTimeDays: 12,
    description:
      'Exposed sculpted walnut timber frame with removable linen covers paired with our low architectural coffee table.',
    descriptionRw:
      'Intebe za salon zifite igiti kigaragara hanze n’ameza yo hagati bijyanye, zikoreshejwe igitambaro gishobora kumeswa.',
    imageUrl: '/src/assets/images/hero_living_room_1795425660795.jpg',
    momoCode: '*182*8*1*512904#',
    phone: '+250 788 530 214',
    bankAccount: 'Equity · 40022-1198340-09',
    createdAt: '2026-11-22T07:45:00.000Z',
  },
  {
    id: 'prod-heritage-restored-chair',
    sellerId: 'workshop-kimironko-seating',
    sellerName: 'Eric Ndayisenga',
    workshopName: 'Kimironko Fine Seating',
    location: 'Kimironko, Kigali',
    originCoords: LOCATION_COORDS.kimironko,
    title: 'Restored Hardwood Accent Chair',
    titleRw: 'Intebe Yasannwe mu Buhanga (Indigo Linen)',
    category: 'accent',
    listingMode: 'sale',
    priceRwf: 175000,
    material: 'Restored Hardwood & Indigo Linen',
    dimensions: '68 × 72 × 94 cm',
    leadTimeDays: 4,
    description:
      'Classic hardwood frame rebuilt from the joints up with fresh foam webbing, brass tacking, and indigo linen.',
    descriptionRw:
      'Intebe y’igiti cy’umwimerere yongewe imbaraga mu ngingo, igashyirwamo iponji nshya n’igitambaro cya indigo.',
    imageUrl: '/src/assets/images/repair_craftsman_studio_1795425663920.jpg',
    momoCode: '*182*8*1*663812#',
    phone: '+250 783 901 445',
    bankAccount: 'I&M · 20010-8834210-12',
    createdAt: '2026-11-22T10:05:00.000Z',
  },
];

const DEFAULT_ADS: StoredAdVideo[] = [
  {
    id: 'ad-jokeve-walnut-showcase',
    sellerId: 'workshop-nyamirambo-craft',
    sellerName: 'Jean-Paul Habimana',
    workshopName: 'Nyamirambo Heritage Woodwork',
    title: 'Garde-robe & Utubati tw’Igiti cy’Umwimerere',
    caption:
      'Custom solid walnut wardrobes, dining sets, and hardwood beds crafted to your room measurements.',
    ctaLabel: 'Reba Garde-robe',
    productId: 'prod-walnut-wardrobe-cabinet',
    mediaType: 'slideshow',
    posterImageUrl: '/src/assets/images/wardrobe_cabinet_walnut_1795441272016.jpg',
    slideshowImages: [
      '/src/assets/images/wardrobe_cabinet_walnut_1795441272016.jpg',
      '/src/assets/images/bed_frame_hardwood_1795441272228.jpg',
      '/src/assets/images/dining_set_walnut_1795425663356.jpg',
    ],
    slideIntervalMs: 3200,
    durationSec: 18,
    status: 'active',
    views: 42,
    createdAt: '2026-11-23T04:15:00.000Z',
  },
  {
    id: 'ad-jokeve-event-rentals',
    sellerId: 'workshop-kimironko-seating',
    sellerName: 'Eric Ndayisenga',
    workshopName: 'Kimironko Fine Seating',
    title: 'Gukodesha Intebe za Plastiki z’Ibirori · 1,500 RWF/day',
    caption:
      'Need 50–500 stackable event chairs delivered anywhere in Kigali or upcountry? Book daily delivery now.',
    ctaLabel: 'Kodesha Nonaha',
    productId: 'prod-plastic-event-chairs',
    mediaType: 'slideshow',
    posterImageUrl: '/src/assets/images/rental_event_chairs_1795441271646.jpg',
    slideshowImages: [
      '/src/assets/images/rental_event_chairs_1795441271646.jpg',
      '/src/assets/images/sofa_boucle_nordic_1795425663358.jpg',
      '/src/assets/images/chair_velvet_emerald_1795425663793.jpg',
    ],
    slideIntervalMs: 3200,
    durationSec: 15,
    status: 'active',
    views: 29,
    createdAt: '2026-11-23T04:30:00.000Z',
  },
];

function createEmptyStore(): StoreData {
  return {
    users: [],
    products: DEFAULT_PRODUCTS.map((p) => ({ ...p })),
    orders: [],
    conversations: [],
    messages: [],
    ads: DEFAULT_ADS.map((a) => ({ ...a })),
    wishlists: {},
    productLikes: {},
    sessionSecret: getEnvSessionSecret() || crypto.randomBytes(32).toString('hex'),
    settings: getDefaultSettings(),
  };
}

function normalizeStore(parsed: Partial<StoreData> | null | undefined): StoreData {
  if (!parsed || typeof parsed !== 'object') {
    return createEmptyStore();
  }
  const existingProducts = Array.isArray(parsed.products)
    ? parsed.products.map((p) => ({
        ...p,
        listingMode: p.listingMode || ('sale' as const),
        originCoords: p.originCoords || resolveCoordsForLocation(p.location || 'Kigali'),
      }))
    : [];
  const existingIds = new Set(existingProducts.map((p) => p.id));
  const mergedProducts = [...existingProducts];
  for (const seed of DEFAULT_PRODUCTS) {
    if (!existingIds.has(seed.id)) {
      mergedProducts.push(seed);
    }
  }
  const users = Array.isArray(parsed.users)
    ? parsed.users.map((u) => ({
        ...u,
        status: u.status || ('active' as const),
      }))
    : [];
  const existingAds: StoredAdVideo[] = Array.isArray(parsed.ads)
    ? parsed.ads.map((a) => {
        const seedMatch = DEFAULT_ADS.find((s) => s.id === a.id);
        return {
          ...a,
          mediaType: a.mediaType || (a.videoUrl ? ('video' as const) : ('slideshow' as const)),
          slideshowImages:
            Array.isArray(a.slideshowImages) && a.slideshowImages.length > 0
              ? a.slideshowImages
              : seedMatch?.slideshowImages,
          slideIntervalMs: a.slideIntervalMs || 3200,
        };
      })
    : [];
  const existingAdIds = new Set(existingAds.map((a) => a.id));
  const mergedAds: StoredAdVideo[] = [...existingAds];
  for (const seedAd of DEFAULT_ADS) {
    if (!existingAdIds.has(seedAd.id)) {
      mergedAds.push(seedAd);
    }
  }
  const wishlists: Record<string, string[]> = {};
  if (parsed.wishlists && typeof parsed.wishlists === 'object' && !Array.isArray(parsed.wishlists)) {
    for (const [uid, ids] of Object.entries(parsed.wishlists)) {
      if (Array.isArray(ids)) {
        wishlists[uid] = Array.from(
          new Set(ids.filter((id): id is string => typeof id === 'string'))
        );
      }
    }
  }
  const productLikes: Record<string, string[]> = {};
  if (
    parsed.productLikes &&
    typeof parsed.productLikes === 'object' &&
    !Array.isArray(parsed.productLikes)
  ) {
    for (const [pid, voters] of Object.entries(parsed.productLikes)) {
      if (Array.isArray(voters)) {
        productLikes[pid] = Array.from(
          new Set(voters.filter((v): v is string => typeof v === 'string'))
        );
      }
    }
  }

  const defaults = getDefaultSettings();
  const mergedSettings: SiteSettings =
    parsed.settings &&
    parsed.settings.platformName &&
    parsed.settings.platformName !== 'Smart Home Design' &&
    parsed.settings.platformName !== 'JOKEVA FURNITURE'
      ? { ...defaults, ...parsed.settings, adminEmail: getDesignatedAdminEmail() }
      : { ...defaults, ...(parsed.settings || {}), platformName: 'JOKEVE FURNITURE', adminEmail: getDesignatedAdminEmail() };

  return {
    users,
    products: mergedProducts.length > 0 ? mergedProducts : DEFAULT_PRODUCTS,
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    ads: mergedAds.length > 0 ? mergedAds : DEFAULT_ADS,
    wishlists,
    productLikes,
    sessionSecret:
      getEnvSessionSecret() ||
      (typeof parsed.sessionSecret === 'string' && parsed.sessionSecret.length >= 32
        ? parsed.sessionSecret
        : crypto.randomBytes(32).toString('hex')),
    adminCredential: parsed.adminCredential,
    settings: mergedSettings,
  };
}

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('250') && digits.length >= 12) {
    return digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    return digits.slice(1);
  }
  return digits;
}

function getEffectivePermissions(u: StoredUser): UserPermissions {
  if (u.role === 'admin') {
    return {
      canPostProducts: true,
      canPostAds: true,
      canSendChat: true,
      canPlaceOrders: true,
    };
  }
  return {
    canPostProducts: u.permissions?.canPostProducts !== false,
    canPostAds: u.permissions?.canPostAds !== false,
    canSendChat: u.permissions?.canSendChat !== false,
    canPlaceOrders: u.permissions?.canPlaceOrders !== false,
  };
}

function hasPermission(u: StoredUser, key: keyof UserPermissions): boolean {
  if (u.role === 'admin') return true;
  return getEffectivePermissions(u)[key];
}

function sanitizeUser(u: StoredUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    avatarUrl: u.avatarUrl,
    workshopName: u.workshopName,
    location: u.location,
    momoCode: u.momoCode,
    bankAccount: u.bankAccount,
    permissions: getEffectivePermissions(u),
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

function isSafeImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 3_500_000) return false;
  if (trimmed.startsWith('/src/assets/images/') && !trimmed.includes('..')) {
    return /^\/src\/assets\/images\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/.test(trimmed);
  }
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return true;
  }
  return false;
}

function isSafeVideoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes('..')) return false;
  return /^\/uploads\/ad-[a-zA-Z0-9-]+\.(mp4|webm|mov)$/.test(trimmed);
}

function isSafeAudioUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes('..')) return false;
  return /^\/uploads\/voice-[a-zA-Z0-9-]+\.(webm|ogg|mp3|wav|m4a)$/.test(trimmed);
}

function sanitizeSlideshowImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid: string[] = [];
  for (const item of raw) {
    if (isSafeImageUrl(item) && !valid.includes(item)) {
      valid.push(item);
      if (valid.length >= 10) break;
    }
  }
  return valid;
}

function isSafeExternalUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export interface ApiAppController {
  app: express.Express;
  flushSaves: () => Promise<void>;
}

export function createApiApp(options: { serverless?: boolean } = {}): ApiAppController {
  const serverlessMode = Boolean(options.serverless || isRunningOnNetlify());
  const dataDir = serverlessMode ? TMP_DATA_DIR : LOCAL_DATA_DIR;
  const uploadsDir = path.resolve(dataDir, 'uploads');
  const storePath = path.resolve(dataDir, 'store.json');

  let store: StoreData = createEmptyStore();
  let localBootstrapped = false;
  let pendingWrite: Promise<void> = Promise.resolve();

  function loadLocalDiskStore(): StoreData {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(storePath)) {
      if (serverlessMode && fs.existsSync(BUNDLED_STORE_PATH)) {
        try {
          const bundled = JSON.parse(fs.readFileSync(BUNDLED_STORE_PATH, 'utf8')) as Partial<StoreData>;
          const normalized = normalizeStore(bundled);
          fs.writeFileSync(storePath, JSON.stringify(normalized, null, 2), 'utf8');
          return normalized;
        } catch {
          // fall through to fresh store
        }
      }
      const initial = createEmptyStore();
      fs.writeFileSync(storePath, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    try {
      const raw = fs.readFileSync(storePath, 'utf8');
      return normalizeStore(JSON.parse(raw) as Partial<StoreData>);
    } catch {
      return createEmptyStore();
    }
  }

  function writeLocalDiskStore(data: StoreData) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tmpPath = `${storePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, storePath);
  }

  async function ensureLoaded() {
    if (serverlessMode) {
      try {
        const blobStore = getStore({ name: 'jokeve-store', consistency: 'strong' });
        const remote = (await blobStore.get('store.json', { type: 'json' })) as Partial<StoreData> | null;
        if (remote) {
          store = normalizeStore(remote);
          return;
        }
        // Seed initial Blob state from bundled data/store.json if present
        let seeded = createEmptyStore();
        if (fs.existsSync(BUNDLED_STORE_PATH)) {
          try {
            const raw = JSON.parse(fs.readFileSync(BUNDLED_STORE_PATH, 'utf8')) as Partial<StoreData>;
            seeded = normalizeStore(raw);
          } catch {
            seeded = createEmptyStore();
          }
        }
        store = seeded;
        await blobStore.setJSON('store.json', store);
        return;
      } catch {
        // Fallback to /tmp disk if Netlify Blobs context isn't active
      }
    }

    if (!localBootstrapped) {
      store = loadLocalDiskStore();
      localBootstrapped = true;
    }
  }

  function saveStore() {
    if (serverlessMode) {
      const snapshot = store;
      pendingWrite = pendingWrite
        .catch(() => {})
        .then(async () => {
          try {
            const blobStore = getStore({ name: 'jokeve-store', consistency: 'strong' });
            await blobStore.setJSON('store.json', snapshot);
            return;
          } catch {
            // Fallback to /tmp disk
          }
          try {
            writeLocalDiskStore(snapshot);
          } catch {
            // ignore ephemeral filesystem errors
          }
        });
      return;
    }

    writeLocalDiskStore(store);
  }

  async function flushSaves() {
    await pendingWrite;
  }

  async function saveUploadFile(filename: string, buf: Buffer, contentType: string) {
    if (serverlessMode) {
      try {
        const uploadStore = getStore('jokeve-uploads');
        const copy = new Uint8Array(buf.byteLength);
        copy.set(buf);
        await uploadStore.set(filename, copy.buffer, {
          metadata: { contentType },
        });
        return;
      } catch {
        // fallback to /tmp/jokeve-data/uploads
      }
    }
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const resolvedPath = path.resolve(uploadsDir, filename);
    if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
      throw new Error('Invalid upload destination.');
    }
    fs.writeFileSync(resolvedPath, buf);
  }

  async function readUploadFile(
    filename: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const ext = path.extname(filename).toLowerCase();
    const mimeByExt: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': filename.startsWith('ad-') ? 'video/webm' : 'audio/webm',
      '.mov': 'video/quicktime',
      '.ogg': 'audio/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
    };
    const fallbackMime = mimeByExt[ext] || 'application/octet-stream';

    if (serverlessMode) {
      try {
        const uploadStore = getStore('jokeve-uploads');
        const result = await uploadStore.getWithMetadata(filename, { type: 'arrayBuffer' });
        if (result && result.data) {
          const metaMime =
            typeof result.metadata?.contentType === 'string'
              ? result.metadata.contentType
              : fallbackMime;
          return {
            buffer: Buffer.from(result.data),
            contentType: metaMime,
          };
        }
      } catch {
        // fallback to /tmp or local dir
      }
    }

    const candidateDirs = [uploadsDir, path.resolve(LOCAL_DATA_DIR, 'uploads')];
    for (const dir of candidateDirs) {
      const resolved = path.resolve(dir, filename);
      if (resolved.startsWith(dir + path.sep) && fs.existsSync(resolved)) {
        return {
          buffer: fs.readFileSync(resolved),
          contentType: fallbackMime,
        };
      }
    }
    return null;
  }

  if (!serverlessMode) {
    store = loadLocalDiskStore();
    localBootstrapped = true;
    saveStore();
  }

  function getActiveSessionSecret(): string {
    const envSecret = getEnvSessionSecret();
    if (envSecret) return envSecret;
    if (!store.sessionSecret) {
      store.sessionSecret = crypto.randomBytes(32).toString('hex');
      saveStore();
    }
    return store.sessionSecret;
  }

  function signToken(
    userId: string,
    role: 'buyer' | 'seller' | 'admin',
    tokenVersion = 0
  ): string {
    const payload = Buffer.from(
      JSON.stringify({
        uid: userId,
        role,
        tv: tokenVersion,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 90,
      }),
      'utf8'
    ).toString('base64url');
    const sig = crypto
      .createHmac('sha256', getActiveSessionSecret())
      .update(payload)
      .digest('base64url');
    return `${payload}.${sig}`;
  }

  function verifyToken(
    token: string
  ): { uid: string; role: 'buyer' | 'seller' | 'admin'; tv: number } | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getActiveSessionSecret())
      .update(payload)
      .digest('base64url');
    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        uid?: string;
        role?: 'buyer' | 'seller' | 'admin';
        tv?: number;
        exp?: number;
      };
      if (!parsed.uid || !parsed.role || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
        return null;
      }
      return {
        uid: parsed.uid,
        role: parsed.role,
        tv: typeof parsed.tv === 'number' ? parsed.tv : 0,
      };
    } catch {
      return null;
    }
  }

  function buildAdminUser(): StoredUser {
    return {
      id: 'admin-root',
      name: 'Platform Administrator',
      email: getDesignatedAdminEmail(),
      phone: store.settings.supportPhone,
      role: 'admin',
      status: 'active',
      avatarUrl: '/src/assets/images/repair_craftsman_studio_1795425663920.jpg',
      workshopName: 'JOKEVE FURNITURE HQ',
      location: 'Kigali, Rwanda',
      momoCode: store.settings.defaultMomoCode,
      bankAccount: store.settings.defaultBankAccount,
      passwordSalt: '',
      passwordHash: '',
      createdAt: store.adminCredential?.claimedAt || new Date().toISOString(),
    };
  }

  function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const token = header.slice(7).trim();
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    if (decoded.role === 'admin' && decoded.uid === 'admin-root') {
      req.user = buildAdminUser();
      next();
      return;
    }
    const user = store.users.find((u) => u.id === decoded.uid);
    if (!user) {
      res.status(401).json({ error: 'User account not found' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by the administrator.' });
      return;
    }
    if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      res.status(401).json({ error: 'Your session was signed out by the administrator.' });
      return;
    }
    req.user = user;
    next();
  }

  function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    requireAuth(req, res, () => {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Administrator privileges required.' });
        return;
      }
      next();
    });
  }

  const app = express();
  app.set('trust proxy', 1);

  // Hydrate persistent store on every serverless request before routing
  app.use('/api', async (_req, res, next) => {
    try {
      await ensureLoaded();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.get('/uploads/:filename', async (req, res) => {
    const filename = path.basename(String(req.params.filename || ''));
    if (!/^(ad|voice)-[a-zA-Z0-9-]+\.(mp4|webm|mov|ogg|mp3|wav|m4a)$/.test(filename)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    const file = await readUploadFile(filename);
    if (!file) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(file.buffer);
  });

  app.use(
    '/api/ads/upload',
    express.raw({ type: ['video/mp4', 'video/webm', 'video/quicktime'], limit: '150mb' })
  );
  app.use(
    '/api/chat/audio',
    express.raw({
      type: [
        'audio/webm',
        'audio/ogg',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/mp4',
        'audio/x-m4a',
        'video/webm',
      ],
      limit: '10mb',
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', runtime: serverlessMode ? 'netlify-functions' : 'express' });
  });

  // --- Identifier Detection ---
  app.post('/api/auth/identify', (req, res) => {
    const identifier = cleanStr(req.body?.identifier, 120).toLowerCase();
    const isAdminEmail = identifier === getDesignatedAdminEmail();
    const envPasscodeConfigured = Boolean(
      process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0
    );
    const adminClaimed = Boolean(store.adminCredential?.passwordHash);
    res.json({
      isAdminEmail,
      adminClaimed,
      envPasscodeConfigured,
    });
  });

  // --- Admin Email Verification & Sign-In ---
  app.post('/api/auth/admin-login', (req, res) => {
    const designatedEmail = getDesignatedAdminEmail();
    const email = cleanStr(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const emailVerified = req.body?.emailVerified === true;

    if (email !== designatedEmail) {
      res.status(403).json({ error: 'Email does not match the designated Administrator email.' });
      return;
    }
    if (!emailVerified) {
      res.status(400).json({
        error: 'Please verify your designated administrator email before signing in.',
      });
      return;
    }

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      const providedHash = crypto.createHash('sha256').update(password).digest();
      const expectedHash = crypto.createHash('sha256').update(envPasscode).digest();
      if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
        res.status(401).json({ error: 'Invalid administrator passcode.' });
        return;
      }
      const adminUser = buildAdminUser();
      const token = signToken(adminUser.id, 'admin');
      res.json({ token, user: sanitizeUser(adminUser) });
      return;
    }

    if (!store.adminCredential) {
      if (password.length < 6 || password.length > 128) {
        res.status(400).json({ error: 'Set an administrator password of at least 6 characters.' });
        return;
      }
      const { salt, hash } = hashPassword(password);
      store.adminCredential = {
        email: designatedEmail,
        passwordSalt: salt,
        passwordHash: hash,
        claimedAt: new Date().toISOString(),
      };
      saveStore();
      const adminUser = buildAdminUser();
      const token = signToken(adminUser.id, 'admin');
      res.status(201).json({ token, user: sanitizeUser(adminUser) });
      return;
    }

    if (
      !verifyPassword(
        password,
        store.adminCredential.passwordSalt,
        store.adminCredential.passwordHash
      )
    ) {
      res.status(401).json({ error: 'Invalid administrator password.' });
      return;
    }

    const adminUser = buildAdminUser();
    const token = signToken(adminUser.id, 'admin');
    res.json({ token, user: sanitizeUser(adminUser) });
  });

  // --- Buyer / Seller Auth Routes ---
  app.post('/api/auth/register', (req, res) => {
    const designatedEmail = getDesignatedAdminEmail();
    const name = cleanStr(req.body?.name, 80);
    const email = cleanStr(req.body?.email, 120).toLowerCase();
    const phone = cleanStr(req.body?.phone, 32);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role === 'seller' ? 'seller' : 'buyer';
    const avatarUrl = isSafeImageUrl(req.body?.avatarUrl) ? req.body.avatarUrl : undefined;
    const workshopName = cleanStr(req.body?.workshopName, 90);
    const location = cleanStr(req.body?.location, 90);
    const momoCode = cleanStr(req.body?.momoCode, 40);
    const bankAccount = cleanStr(req.body?.bankAccount, 60);

    if (email === designatedEmail) {
      res.status(403).json({
        error:
          'This email is reserved for Administrator access. Sign in via Administrator Verification.',
      });
      return;
    }
    if (name.length < 2) {
      res.status(400).json({ error: 'Please enter your full name (min 2 characters).' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (normalizePhone(phone).length < 7) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (
      store.users.some(
        (u) => u.email === email || normalizePhone(u.phone) === normalizePhone(phone)
      )
    ) {
      res.status(409).json({ error: 'An account with this email or phone number already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const { salt, hash } = hashPassword(password);
    const newUser: StoredUser = {
      id: `user-${crypto.randomUUID()}`,
      name,
      email,
      phone,
      role,
      status: 'active',
      avatarUrl,
      workshopName: role === 'seller' ? workshopName || `${name} Atelier` : undefined,
      location: location || 'Kigali, Rwanda',
      momoCode: role === 'seller' ? momoCode || '*182*8*1*#' : undefined,
      bankAccount: role === 'seller' ? bankAccount : undefined,
      permissions: {
        canPostProducts: true,
        canPostAds: true,
        canSendChat: true,
        canPlaceOrders: true,
      },
      tokenVersion: 0,
      lastLoginAt: now,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: now,
    };

    store.users.push(newUser);
    saveStore();

    const token = signToken(newUser.id, newUser.role, newUser.tokenVersion ?? 0);
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawIdentifier = cleanStr(req.body?.identifier || req.body?.email, 120);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const lower = rawIdentifier.toLowerCase();

    if (lower === getDesignatedAdminEmail()) {
      res.status(400).json({
        error:
          'Administrator email detected. Complete email verification in the Admin login step.',
        requiresAdminVerify: true,
      });
      return;
    }

    const normPhone = normalizePhone(rawIdentifier);
    const user = store.users.find(
      (u) =>
        u.email === lower ||
        (normPhone.length >= 7 && normalizePhone(u.phone) === normPhone)
    );

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid phone/email or password.' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'This account is suspended. Contact the administrator.' });
      return;
    }
    user.lastLoginAt = new Date().toISOString();
    saveStore();
    const token = signToken(user.id, user.role, user.tokenVersion ?? 0);
    res.json({ token, user: sanitizeUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const reqUser = req.user!;
    const refreshedToken = signToken(reqUser.id, reqUser.role, reqUser.tokenVersion ?? 0);
    res.json({ user: sanitizeUser(reqUser), token: refreshedToken });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const reqUser = req.user!;
    if (reqUser.id === 'admin-root') {
      res.json({ user: sanitizeUser(reqUser) });
      return;
    }
    const stored = store.users.find((u) => u.id === reqUser.id);
    if (!stored) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    if (typeof req.body?.name === 'string' && cleanStr(req.body.name, 80).length >= 2) {
      stored.name = cleanStr(req.body.name, 80);
    }
    if (typeof req.body?.workshopName === 'string') {
      stored.workshopName = cleanStr(req.body.workshopName, 90) || stored.workshopName;
    }
    if (typeof req.body?.location === 'string' && cleanStr(req.body.location, 80).length >= 2) {
      stored.location = cleanStr(req.body.location, 80);
    }
    if (typeof req.body?.momoCode === 'string') {
      stored.momoCode = cleanStr(req.body.momoCode, 40) || undefined;
    }
    if (typeof req.body?.bankAccount === 'string') {
      stored.bankAccount = cleanStr(req.body.bankAccount, 60) || undefined;
    }
    if (isSafeImageUrl(req.body?.avatarUrl)) {
      stored.avatarUrl = req.body.avatarUrl;
    }
    saveStore();
    res.json({ user: sanitizeUser(stored) });
  });

  // --- Server-Side Gemini API Endpoint ---
  async function handleGeminiGenerate(req: AuthenticatedRequest, res: Response) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server environment variables.',
      });
      return;
    }

    const prompt = cleanStr(req.body?.prompt, 4000);
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const requestedModel = cleanStr(req.body?.model, 60);
    const model = ALLOWED_GEMINI_MODELS.has(requestedModel)
      ? requestedModel
      : 'gemini-4-hydrogen';
    const systemInstruction = cleanStr(req.body?.systemInstruction, 1000) || undefined;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
      res.json({
        text: response.text || '',
        model,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gemini request failed.';
      res.status(502).json({ error: message });
    }
  }

  app.post('/api/gemini/generate', requireAuth, handleGeminiGenerate);
  app.post('/api/gemini/assist', requireAuth, handleGeminiGenerate);

  function resolveActorKey(req: Request): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.slice(7).trim());
      if (decoded?.uid) return `u:${decoded.uid}`;
    }
    const rawVisitor = cleanStr(req.headers['x-visitor-id'], 64).replace(/[^a-zA-Z0-9_-]/g, '');
    if (rawVisitor.length >= 6) return `v:${rawVisitor}`;
    const ipHash = crypto
      .createHash('sha256')
      .update(String(req.ip || req.socket.remoteAddress || 'anon'))
      .digest('hex')
      .slice(0, 16);
    return `ip:${ipHash}`;
  }

  function enrichProduct(p: StoredProduct, actorKey?: string) {
    const likesArr = store.productLikes?.[p.id] || [];
    let wishlistCount = 0;
    for (const ids of Object.values(store.wishlists || {})) {
      if (ids.includes(p.id)) wishlistCount += 1;
    }
    let ordersCount = 0;
    for (const o of store.orders || []) {
      if (o.productId === p.id && o.status !== 'cancelled') ordersCount += 1;
    }
    const likesCount = likesArr.length;
    const popularityScore = likesCount * 3 + wishlistCount * 2 + ordersCount * 5;
    return {
      ...p,
      likesCount,
      wishlistCount,
      ordersCount,
      popularityScore,
      likedByViewer: actorKey ? likesArr.includes(actorKey) : false,
    };
  }

  // --- Products Routes ---
  app.get('/api/products', (req, res) => {
    const actorKey = resolveActorKey(req);
    const category = cleanStr(req.query.category, 30);
    const search = cleanStr(req.query.q, 80).toLowerCase();
    let list = [...store.products];
    if (category && category !== 'all') {
      list = list.filter((p) => p.category === category);
    }
    if (search) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.titleRw.toLowerCase().includes(search) ||
          p.material.toLowerCase().includes(search) ||
          p.workshopName.toLowerCase().includes(search) ||
          p.location.toLowerCase().includes(search)
      );
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ products: list.map((p) => enrichProduct(p, actorKey)) });
  });

  app.get('/api/products/trending', (req, res) => {
    const actorKey = resolveActorKey(req);
    const enriched = store.products.map((p) => enrichProduct(p, actorKey));
    enriched.sort((a, b) => {
      if (b.popularityScore !== a.popularityScore) {
        return b.popularityScore - a.popularityScore;
      }
      if (b.ordersCount !== a.ordersCount) return b.ordersCount - a.ordersCount;
      if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
      return b.createdAt.localeCompare(a.createdAt);
    });
    res.json({ products: enriched });
  });

  app.post('/api/products/:id/like', (req, res) => {
    const product = store.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const actorKey = resolveActorKey(req);
    if (!store.productLikes) {
      store.productLikes = {};
    }
    const current = store.productLikes[product.id] || [];
    const already = current.includes(actorKey);
    const next = already ? current.filter((k) => k !== actorKey) : [...current, actorKey];
    store.productLikes[product.id] = next;
    saveStore();
    const enriched = enrichProduct(product, actorKey);
    res.json({ product: enriched, likesCount: enriched.likesCount, liked: !already });
  });

  app.post('/api/products', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!hasPermission(user, 'canPostProducts')) {
      res.status(403).json({
        error: 'Your permission to publish furniture listings is restricted by the administrator.',
      });
      return;
    }
    const title = cleanStr(req.body?.title, 100);
    const titleRw = cleanStr(req.body?.titleRw, 100) || title;
    const category = req.body?.category as ProductCategory;
    const listingMode = ['sale', 'rent', 'both'].includes(req.body?.listingMode)
      ? req.body.listingMode
      : 'sale';
    const priceRwf = Number(req.body?.priceRwf);
    const rentalRaw = req.body?.rentalPricePerDayRwf;
    const rentalPricePerDayRwf =
      typeof rentalRaw === 'number' && Number.isFinite(rentalRaw) && rentalRaw >= 500
        ? Math.round(rentalRaw)
        : undefined;
    const material = cleanStr(req.body?.material, 80);
    const dimensions = cleanStr(req.body?.dimensions, 50) || 'Standard';
    const leadTimeDays = Math.min(90, Math.max(1, Number(req.body?.leadTimeDays) || 7));
    const description = cleanStr(req.body?.description, 600);
    const descriptionRw = cleanStr(req.body?.descriptionRw, 600) || description;
    const imageUrl = req.body?.imageUrl;
    const momoCode =
      cleanStr(req.body?.momoCode, 40) || user.momoCode || store.settings.defaultMomoCode;
    const phone = cleanStr(req.body?.phone, 32) || user.phone;
    const bankAccount =
      cleanStr(req.body?.bankAccount, 60) ||
      user.bankAccount ||
      store.settings.defaultBankAccount;
    const location = cleanStr(req.body?.location, 80) || user.location || 'Kigali';

    if (title.length < 3) {
      res.status(400).json({ error: 'Product title must be at least 3 characters.' });
      return;
    }
    if (!VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Invalid furniture category.' });
      return;
    }
    if (!Number.isFinite(priceRwf) || priceRwf < 500 || priceRwf > 100_000_000) {
      res.status(400).json({ error: 'Price must be between 500 and 100,000,000 RWF.' });
      return;
    }
    if (!isSafeImageUrl(imageUrl)) {
      res.status(400).json({
        error: 'Please provide a valid furniture image (JPG, PNG, or WebP).',
      });
      return;
    }

    const explicitOrigin = sanitizeGeoLocation(req.body?.originCoords);

    const newProduct: StoredProduct = {
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      sellerId: user.id,
      sellerName: user.name,
      workshopName: user.workshopName || `${user.name} Studio`,
      location,
      originCoords: explicitOrigin || resolveCoordsForLocation(location),
      title,
      titleRw,
      category,
      listingMode,
      priceRwf: Math.round(priceRwf),
      rentalPricePerDayRwf,
      material: material || 'Hardwood & Fabric',
      dimensions,
      leadTimeDays,
      description: description || title,
      descriptionRw,
      imageUrl,
      momoCode,
      phone,
      bankAccount,
      createdAt: new Date().toISOString(),
    };

    store.products.unshift(newProduct);
    saveStore();
    res.status(201).json({ product: newProduct });
  });

  app.patch('/api/products/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!hasPermission(user, 'canPostProducts')) {
      res.status(403).json({
        error: 'Your permission to edit furniture listings is restricted by the administrator.',
      });
      return;
    }
    const product = store.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    if (product.sellerId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'You can only edit your own listings.' });
      return;
    }

    if (typeof req.body?.title === 'string' && cleanStr(req.body.title, 100).length >= 3) {
      product.title = cleanStr(req.body.title, 100);
    }
    if (typeof req.body?.titleRw === 'string' && cleanStr(req.body.titleRw, 100).length >= 3) {
      product.titleRw = cleanStr(req.body.titleRw, 100);
    } else if (typeof req.body?.title === 'string' && cleanStr(req.body.title, 100).length >= 3) {
      product.titleRw = cleanStr(req.body.title, 100);
    }
    if (VALID_CATEGORIES.includes(req.body?.category)) {
      product.category = req.body.category;
    }
    if (['sale', 'rent', 'both'].includes(req.body?.listingMode)) {
      product.listingMode = req.body.listingMode;
    }
    if (
      typeof req.body?.priceRwf === 'number' &&
      Number.isFinite(req.body.priceRwf) &&
      req.body.priceRwf >= 500 &&
      req.body.priceRwf <= 100_000_000
    ) {
      product.priceRwf = Math.round(req.body.priceRwf);
    }
    if (req.body?.rentalPricePerDayRwf === null) {
      product.rentalPricePerDayRwf = undefined;
    } else if (
      typeof req.body?.rentalPricePerDayRwf === 'number' &&
      Number.isFinite(req.body.rentalPricePerDayRwf) &&
      req.body.rentalPricePerDayRwf >= 500
    ) {
      product.rentalPricePerDayRwf = Math.round(req.body.rentalPricePerDayRwf);
    }
    if (typeof req.body?.material === 'string' && cleanStr(req.body.material, 80).length >= 2) {
      product.material = cleanStr(req.body.material, 80);
    }
    if (typeof req.body?.dimensions === 'string' && cleanStr(req.body.dimensions, 50).length >= 2) {
      product.dimensions = cleanStr(req.body.dimensions, 50);
    }
    if (typeof req.body?.leadTimeDays === 'number' && Number.isFinite(req.body.leadTimeDays)) {
      product.leadTimeDays = Math.min(90, Math.max(1, Math.round(req.body.leadTimeDays)));
    }
    if (
      typeof req.body?.description === 'string' &&
      cleanStr(req.body.description, 600).length >= 2
    ) {
      product.description = cleanStr(req.body.description, 600);
    }
    if (
      typeof req.body?.descriptionRw === 'string' &&
      cleanStr(req.body.descriptionRw, 600).length >= 2
    ) {
      product.descriptionRw = cleanStr(req.body.descriptionRw, 600);
    } else if (
      typeof req.body?.description === 'string' &&
      cleanStr(req.body.description, 600).length >= 2
    ) {
      product.descriptionRw = cleanStr(req.body.description, 600);
    }
    if (isSafeImageUrl(req.body?.imageUrl)) {
      product.imageUrl = req.body.imageUrl;
    }
    if (typeof req.body?.momoCode === 'string' && cleanStr(req.body.momoCode, 40).length >= 3) {
      product.momoCode = cleanStr(req.body.momoCode, 40);
    }
    if (typeof req.body?.phone === 'string' && cleanStr(req.body.phone, 32).length >= 6) {
      product.phone = cleanStr(req.body.phone, 32);
    }
    if (typeof req.body?.bankAccount === 'string') {
      product.bankAccount = cleanStr(req.body.bankAccount, 60);
    }
    if (typeof req.body?.location === 'string' && cleanStr(req.body.location, 160).length >= 2) {
      product.location = cleanStr(req.body.location, 160);
      product.originCoords =
        sanitizeGeoLocation(req.body?.originCoords) || resolveCoordsForLocation(product.location);
    } else if (req.body?.originCoords) {
      const explicit = sanitizeGeoLocation(req.body.originCoords);
      if (explicit) {
        product.originCoords = explicit;
        product.location = explicit.label;
      }
    }

    saveStore();
    res.json({ product });
  });

  app.delete('/api/products/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    if (store.products[idx].sellerId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'You can only remove your own listings.' });
      return;
    }
    store.products.splice(idx, 1);
    saveStore();
    res.json({ ok: true });
  });

  // --- Persistent Wishlist Routes ---
  app.get('/api/wishlist', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const validIds = new Set(store.products.map((p) => p.id));
    const current = (store.wishlists[user.id] || []).filter((id) => validIds.has(id));
    res.json({ productIds: current });
  });

  app.post('/api/wishlist', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const productId = cleanStr(req.body?.productId, 80);
    if (!productId || !store.products.some((p) => p.id === productId)) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const validIds = new Set(store.products.map((p) => p.id));
    const current = (store.wishlists[user.id] || []).filter((id) => validIds.has(id));
    const exists = current.includes(productId);
    const next = exists ? current.filter((id) => id !== productId) : [productId, ...current];
    store.wishlists[user.id] = next;
    saveStore();
    res.json({ productIds: next, saved: !exists });
  });

  app.put('/api/wishlist/sync', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const incoming = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
    const validIds = new Set(store.products.map((p) => p.id));
    const current = (store.wishlists[user.id] || []).filter((id) => validIds.has(id));
    const merged = [...current];
    for (const rawId of incoming) {
      if (typeof rawId === 'string' && validIds.has(rawId) && !merged.includes(rawId)) {
        merged.push(rawId);
      }
    }
    store.wishlists[user.id] = merged;
    saveStore();
    res.json({ productIds: merged });
  });

  app.delete('/api/wishlist/:productId', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const productId = cleanStr(req.params.productId, 80);
    const current = store.wishlists[user.id] || [];
    const next = current.filter((id) => id !== productId);
    store.wishlists[user.id] = next;
    saveStore();
    res.json({ productIds: next });
  });

  // --- Orders (Purchase, Custom Command, Repair, Rent) ---
  app.get('/api/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const myOrders =
      user.role === 'admin'
        ? [...store.orders]
        : store.orders.filter((o) => o.buyerId === user.id || o.sellerId === user.id);
    myOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ orders: myOrders });
  });

  app.post('/api/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!hasPermission(user, 'canPlaceOrders')) {
      res.status(403).json({
        error: 'Your ordering permission is restricted by the administrator.',
      });
      return;
    }
    const orderType = req.body?.orderType;
    if (!['purchase', 'custom', 'repair', 'rent'].includes(orderType)) {
      res.status(400).json({ error: 'Invalid order type.' });
      return;
    }

    const productId = cleanStr(req.body?.productId, 80);
    const linkedProduct = productId ? store.products.find((p) => p.id === productId) : undefined;

    const sellerId =
      linkedProduct?.sellerId ||
      cleanStr(req.body?.sellerId, 80) ||
      'workshop-nyamirambo-craft';
    const sellerProductMatch = store.products.find((p) => p.sellerId === sellerId);
    const sellerName =
      linkedProduct?.sellerName ||
      sellerProductMatch?.sellerName ||
      cleanStr(req.body?.sellerName, 80) ||
      'Jean-Paul Habimana';
    const workshopName =
      linkedProduct?.workshopName ||
      sellerProductMatch?.workshopName ||
      cleanStr(req.body?.workshopName, 90) ||
      'Nyamirambo Heritage Woodwork';

    const productTitle =
      cleanStr(req.body?.productTitle, 120) ||
      linkedProduct?.title ||
      'Custom Furniture / Repair';
    const referenceImageUrl = isSafeImageUrl(req.body?.referenceImageUrl)
      ? req.body.referenceImageUrl
      : linkedProduct?.imageUrl || '/src/assets/images/repair_craftsman_studio_1795425663920.jpg';
    const uploadedPhotoUrl = isSafeImageUrl(req.body?.uploadedPhotoUrl)
      ? req.body.uploadedPhotoUrl
      : undefined;

    const paymentMethod = req.body?.paymentMethod;
    if (!['momo_code', 'phone', 'bank', 'cod'].includes(paymentMethod)) {
      res.status(400).json({ error: 'Please select a valid payment method.' });
      return;
    }

    const agreedPriceRwf = Number(req.body?.agreedPriceRwf ?? linkedProduct?.priceRwf ?? 0);
    if (!Number.isFinite(agreedPriceRwf) || agreedPriceRwf < 0 || agreedPriceRwf > 200_000_000) {
      res.status(400).json({ error: 'Invalid order amount.' });
      return;
    }

    const deliveryAddress = cleanStr(req.body?.deliveryAddress, 220);
    if (deliveryAddress.length < 2) {
      res.status(400).json({ error: 'Please select or enter your delivery location.' });
      return;
    }

    const originCoords =
      linkedProduct?.originCoords ||
      sellerProductMatch?.originCoords ||
      LOCATION_COORDS.nyamirambo;
    const rawBuyerCoords = req.body?.buyerCoords;
    const buyerCoords: GeoLocation =
      rawBuyerCoords &&
      typeof rawBuyerCoords.lat === 'number' &&
      typeof rawBuyerCoords.lng === 'number'
        ? {
            lat: rawBuyerCoords.lat,
            lng: rawBuyerCoords.lng,
            label: cleanStr(rawBuyerCoords.label, 180) || deliveryAddress,
          }
        : resolveCoordsForLocation(deliveryAddress);

    const distanceKm =
      typeof req.body?.distanceKm === 'number' && Number.isFinite(req.body.distanceKm)
        ? Math.round(req.body.distanceKm * 10) / 10
        : undefined;

    const rentalDays =
      orderType === 'rent'
        ? Math.max(1, Math.min(365, Number(req.body?.rentalDays) || 1))
        : undefined;
    const rentalQuantity =
      orderType === 'rent'
        ? Math.max(1, Math.min(2000, Number(req.body?.rentalQuantity) || 1))
        : undefined;

    const now = new Date().toISOString();
    const newOrder: StoredOrder = {
      id: `ORD-${Math.floor(10000 + Math.random() * 89999)}`,
      orderType,
      buyerId: user.id,
      buyerName: user.name,
      buyerPhone: cleanStr(req.body?.buyerPhone, 32) || user.phone,
      sellerId,
      sellerName,
      workshopName,
      productId: linkedProduct?.id,
      productTitle,
      referenceImageUrl,
      uploadedPhotoUrl,
      fabricChoice: cleanStr(req.body?.fabricChoice, 80) || undefined,
      dimensions: cleanStr(req.body?.dimensions, 60) || undefined,
      repairType: cleanStr(req.body?.repairType, 80) || undefined,
      rentalDays,
      rentalQuantity,
      notes: cleanStr(req.body?.notes, 500),
      deliveryAddress,
      buyerCoords,
      originCoords,
      distanceKm,
      agreedPriceRwf: Math.round(agreedPriceRwf),
      paymentMethod,
      paymentRef:
        cleanStr(req.body?.paymentRef, 80) ||
        (paymentMethod === 'cod' ? 'Cash on Delivery' : 'Awaiting payment reference'),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    store.orders.unshift(newOrder);
    saveStore();
    res.status(201).json({ order: newOrder });
  });

  app.patch('/api/orders/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.sellerId !== user.id && order.buyerId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to update this order.' });
      return;
    }

    if (
      (order.sellerId === user.id || user.role === 'admin') &&
      ['pending', 'confirmed', 'in_craft', 'delivered', 'cancelled'].includes(req.body?.status)
    ) {
      order.status = req.body.status;
    }
    if (typeof req.body?.paymentRef === 'string' && cleanStr(req.body.paymentRef, 80).length > 0) {
      order.paymentRef = cleanStr(req.body.paymentRef, 80);
    }
    order.updatedAt = new Date().toISOString();
    saveStore();
    res.json({ order });
  });

  app.patch('/api/orders/:id/location', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.sellerId !== user.id && user.role !== 'admin') {
      res.status(403).json({
        error: 'Only the workshop/courier or administrator can share delivery location.',
      });
      return;
    }
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const label = cleanStr(req.body?.label, 200) || 'On the way';
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ error: 'Invalid GPS coordinates.' });
      return;
    }
    const now = new Date().toISOString();
    order.driverCoords = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)), label };
    order.driverLocationLabel = label;
    order.driverUpdatedAt = now;
    order.updatedAt = now;
    saveStore();
    res.json({ order });
  });

  app.patch('/api/orders/:id/origin', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.sellerId !== user.id && user.role !== 'admin') {
      res.status(403).json({
        error: 'Only the workshop or administrator can set dispatch origin.',
      });
      return;
    }
    const nextOrigin = sanitizeGeoLocation({
      lat: req.body?.lat,
      lng: req.body?.lng,
      label: req.body?.label,
    });
    if (!nextOrigin) {
      res.status(400).json({ error: 'Invalid dispatch origin coordinates or address.' });
      return;
    }
    order.originCoords = nextOrigin;
    order.updatedAt = new Date().toISOString();
    saveStore();
    res.json({ order });
  });

  // --- Conversations & Online Chat ---
  app.get('/api/chat/contacts', requireAuth, (req: AuthenticatedRequest, res) => {
    const requester = req.user!;
    const contactMap = new Map<
      string,
      {
        id: string;
        name: string;
        role: 'buyer' | 'seller' | 'admin';
        workshopName?: string;
        location?: string;
        avatarUrl?: string;
      }
    >();

    if (requester.id !== 'admin-root') {
      const adminObj = buildAdminUser();
      contactMap.set(adminObj.id, {
        id: adminObj.id,
        name: 'JOKEVE Support & Admin',
        role: 'admin',
        workshopName: adminObj.workshopName,
        location: adminObj.location,
        avatarUrl: adminObj.avatarUrl,
      });
    }

    for (const u of store.users) {
      if (u.id === requester.id || u.status !== 'active') continue;
      contactMap.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.role,
        workshopName: u.workshopName,
        location: u.location,
        avatarUrl: u.avatarUrl,
      });
    }

    for (const p of store.products) {
      if (p.sellerId === requester.id || contactMap.has(p.sellerId)) continue;
      contactMap.set(p.sellerId, {
        id: p.sellerId,
        name: p.sellerName,
        role: 'seller',
        workshopName: p.workshopName,
        location: p.location,
        avatarUrl: p.imageUrl,
      });
    }

    res.json({ contacts: Array.from(contactMap.values()) });
  });

  app.get('/api/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const mine = (
      user.role === 'admin'
        ? [...store.conversations]
        : store.conversations.filter((c) => c.buyerId === user.id || c.sellerId === user.id)
    ).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    res.json({ conversations: mine });
  });

  app.post('/api/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!hasPermission(user, 'canSendChat')) {
      res.status(403).json({
        error: 'Your Uruganiriro messaging permission is restricted by the administrator.',
      });
      return;
    }
    const productId = cleanStr(req.body?.productId, 80);
    const targetUserId = cleanStr(req.body?.targetUserId, 80);
    const product = productId ? store.products.find((p) => p.id === productId) : undefined;

    let buyerId = user.id;
    let buyerName = user.name;
    let sellerId = product?.sellerId || cleanStr(req.body?.sellerId, 80) || 'admin-root';
    let sellerName =
      product?.sellerName || cleanStr(req.body?.sellerName, 80) || 'JOKEVE Administrator';
    let workshopName =
      product?.workshopName || cleanStr(req.body?.workshopName, 90) || 'JOKEVE FURNITURE HQ';
    let productTitle =
      product?.title || cleanStr(req.body?.productTitle, 120) || 'JOKEVE Direct Consultation';
    let productImageUrl =
      product?.imageUrl ||
      (isSafeImageUrl(req.body?.productImageUrl)
        ? req.body.productImageUrl
        : '/src/assets/images/hero_living_room_1795425660795.jpg');

    if (targetUserId) {
      if (targetUserId === 'admin-root') {
        sellerId = 'admin-root';
        sellerName = 'JOKEVE Support & Admin';
        workshopName = 'JOKEVE FURNITURE HQ';
        productTitle =
          cleanStr(req.body?.productTitle, 120) || 'JOKEVE Support & Custom Inquiry';
      } else {
        const matchedUser = store.users.find((u) => u.id === targetUserId);
        const matchedProd = store.products.find((p) => p.sellerId === targetUserId);
        if (user.role === 'admin' && matchedUser) {
          buyerId = matchedUser.id;
          buyerName = matchedUser.name;
          sellerId = 'admin-root';
          sellerName = 'Platform Administrator';
          workshopName = matchedUser.workshopName || 'JOKEVE FURNITURE HQ';
          productTitle =
            cleanStr(req.body?.productTitle, 120) || `Direct Message · ${matchedUser.name}`;
        } else if (matchedUser) {
          sellerId = matchedUser.id;
          sellerName = matchedUser.name;
          workshopName = matchedUser.workshopName || `${matchedUser.name}`;
          productTitle = cleanStr(req.body?.productTitle, 120) || `Chat with ${matchedUser.name}`;
          if (matchedUser.avatarUrl) productImageUrl = matchedUser.avatarUrl;
        } else if (matchedProd) {
          sellerId = matchedProd.sellerId;
          sellerName = matchedProd.sellerName;
          workshopName = matchedProd.workshopName;
          productTitle = cleanStr(req.body?.productTitle, 120) || matchedProd.title;
          productImageUrl = matchedProd.imageUrl;
        }
      }
    } else if (!product) {
      const sellerFallback = store.products.find((p) => p.sellerId === sellerId);
      if (sellerFallback) {
        sellerName = sellerFallback.sellerName;
        workshopName = sellerFallback.workshopName;
        productImageUrl = isSafeImageUrl(req.body?.productImageUrl)
          ? req.body.productImageUrl
          : sellerFallback.imageUrl;
      }
    }

    const forceNew = req.body?.forceNew === true;
    const existing = forceNew
      ? undefined
      : store.conversations.find(
          (c) =>
            c.buyerId === buyerId &&
            c.sellerId === sellerId &&
            (productId ? c.productId === productId : c.productTitle === productTitle)
        );
    if (existing) {
      const msgs = store.messages
        .filter((m) => m.conversationId === existing.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      res.json({ conversation: existing, messages: msgs });
      return;
    }

    const now = new Date().toISOString();
    const conv: StoredConversation = {
      id: `conv-${crypto.randomUUID().slice(0, 8)}`,
      productId: product?.id,
      productTitle,
      productImageUrl,
      buyerId,
      buyerName,
      sellerId,
      sellerName,
      workshopName,
      lastMessage: 'Conversation opened',
      lastMessageAt: now,
    };

    store.conversations.unshift(conv);
    saveStore();
    res.status(201).json({ conversation: conv, messages: [] });
  });

  app.get('/api/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const conv = store.conversations.find((c) => c.id === req.params.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    if (conv.buyerId !== user.id && conv.sellerId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied to this conversation.' });
      return;
    }
    const msgs = store.messages
      .filter((m) => m.conversationId === conv.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    res.json({ conversation: conv, messages: msgs });
  });

  // --- Voice / Audio Upload for Chat ---
  app.post('/api/chat/audio', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!hasPermission(user, 'canSendChat')) {
      res.status(403).json({
        error: 'Your Uruganiriro messaging permission is restricted by the administrator.',
      });
      return;
    }
    const rawType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const extMap: Record<string, string> = {
      'audio/webm': 'webm',
      'video/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
    };
    const ext = extMap[rawType];
    if (!ext) {
      res.status(400).json({ error: 'Only WebM, OGG, MP3, WAV, or M4A audio clips are supported.' });
      return;
    }
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length < 128 || buf.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'Audio clip must be non-empty and under 10 MB.' });
      return;
    }
    const isWebm =
      ext === 'webm' && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
    const isOgg = ext === 'ogg' && buf.subarray(0, 4).toString('ascii') === 'OggS';
    const isWav = ext === 'wav' && buf.subarray(0, 4).toString('ascii') === 'RIFF';
    const isMp3 =
      ext === 'mp3' &&
      (buf.subarray(0, 3).toString('ascii') === 'ID3' ||
        (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0));
    const isM4a = ext === 'm4a' && buf.subarray(4, 12).toString('ascii').includes('ftyp');
    if (!isWebm && !isOgg && !isWav && !isMp3 && !isM4a) {
      res.status(400).json({ error: 'Uploaded audio file header does not match its declared format.' });
      return;
    }
    const filename = `voice-${crypto.randomUUID()}.${ext}`;
    try {
      await saveUploadFile(filename, buf, rawType);
      res.status(201).json({ audioUrl: `/uploads/${filename}` });
    } catch {
      res.status(400).json({ error: 'Invalid upload destination.' });
    }
  });

  app.post('/api/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!hasPermission(user, 'canSendChat')) {
      res.status(403).json({
        error: 'Your Uruganiriro messaging permission is restricted by the administrator.',
      });
      return;
    }
    const conv = store.conversations.find((c) => c.id === req.params.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    if (conv.buyerId !== user.id && conv.sellerId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied to this conversation.' });
      return;
    }

    const text = cleanStr(req.body?.text, 1000);
    const imageUrl = isSafeImageUrl(req.body?.imageUrl) ? req.body.imageUrl : undefined;
    const audioUrl = isSafeAudioUrl(req.body?.audioUrl) ? req.body.audioUrl : undefined;
    const audioDurationRaw = Number(req.body?.audioDurationSec);
    const audioDurationSec =
      audioUrl && Number.isFinite(audioDurationRaw) && audioDurationRaw >= 1 && audioDurationRaw <= 600
        ? Math.round(audioDurationRaw)
        : undefined;
    const offerRaw = req.body?.offerPriceRwf;
    const offerPriceRwf =
      typeof offerRaw === 'number' &&
      Number.isFinite(offerRaw) &&
      offerRaw >= 1000 &&
      offerRaw <= 200_000_000
        ? Math.round(offerRaw)
        : undefined;

    if (!text && !offerPriceRwf && !imageUrl && !audioUrl) {
      res.status(400).json({ error: 'Message, photo, voice note, or price offer cannot be empty.' });
      return;
    }

    const now = new Date().toISOString();
    const msg: StoredMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      conversationId: conv.id,
      senderId: user.id,
      senderName: user.role === 'admin' ? `${user.name} (Admin)` : user.name,
      senderRole: user.role === 'admin' ? 'admin' : conv.sellerId === user.id ? 'seller' : 'buyer',
      senderAvatarUrl: user.avatarUrl,
      text:
        text ||
        (audioUrl
          ? 'Voice note'
          : imageUrl
          ? 'Shared a photo'
          : `Proposed price: ${offerPriceRwf?.toLocaleString()} RWF`),
      imageUrl,
      audioUrl,
      audioDurationSec,
      offerPriceRwf,
      createdAt: now,
    };

    store.messages.push(msg);
    conv.lastMessage =
      audioUrl && !text
        ? '[Voice Note]'
        : imageUrl && !text
        ? '[Photo]'
        : msg.text;
    conv.lastMessageAt = now;
    if (offerPriceRwf) {
      conv.negotiatedPriceRwf = offerPriceRwf;
    }
    saveStore();
    res.status(201).json({ message: msg, conversation: conv });
  });

  // --- Short-Video Advertisement Routes (Administrator Controlled) ---
  app.get('/api/ads', (_req, res) => {
    const activeAds = store.ads
      .filter((a) => a.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({
      ads: activeAds,
      adBannerTitle: store.settings.adBannerTitle || '',
      adBannerText: store.settings.adBannerText || '',
    });
  });

  app.post('/api/ads/upload', requireAdmin, async (req: AuthenticatedRequest, res) => {
    const rawType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const extMap: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    const ext = extMap[rawType];
    if (!ext) {
      res.status(400).json({ error: 'Only MP4, WebM, or MOV short videos are supported.' });
      return;
    }
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length < 256 || buf.length > 150 * 1024 * 1024) {
      res.status(400).json({ error: 'Video file must be non-empty and under 150 MB.' });
      return;
    }
    const isWebm =
      ext === 'webm' && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
    const isMp4OrMov =
      (ext === 'mp4' || ext === 'mov') && buf.subarray(4, 12).toString('ascii').includes('ftyp');
    if (!isWebm && !isMp4OrMov) {
      res.status(400).json({ error: 'Uploaded file header does not match MP4/WebM/MOV video.' });
      return;
    }
    const filename = `ad-${crypto.randomUUID()}.${ext}`;
    try {
      await saveUploadFile(filename, buf, rawType);
      res.status(201).json({ videoUrl: `/uploads/${filename}` });
    } catch {
      res.status(400).json({ error: 'Invalid upload destination.' });
    }
  });

  app.post('/api/ads', requireAdmin, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const title = cleanStr(req.body?.title, 100);
    const caption = cleanStr(req.body?.caption, 300);
    const ctaLabel = cleanStr(req.body?.ctaLabel, 40) || 'Reba Igicuruzwa';
    const workshopName =
      cleanStr(req.body?.workshopName, 90) || user.workshopName || `${user.name} Studio`;
    const productId = cleanStr(req.body?.productId, 80) || undefined;
    const linkedProduct = productId ? store.products.find((p) => p.id === productId) : undefined;
    const videoUrl = isSafeVideoUrl(req.body?.videoUrl) ? req.body.videoUrl : undefined;
    const slideshowImages = sanitizeSlideshowImages(req.body?.slideshowImages);
    const requestedType = req.body?.mediaType === 'slideshow' ? 'slideshow' : 'video';
    const mediaType: 'video' | 'slideshow' =
      requestedType === 'slideshow' || (!videoUrl && slideshowImages.length > 0)
        ? 'slideshow'
        : 'video';
    const posterImageUrl = isSafeImageUrl(req.body?.posterImageUrl)
      ? req.body.posterImageUrl
      : slideshowImages[0] ||
        linkedProduct?.imageUrl ||
        '/src/assets/images/hero_living_room_1795425660795.jpg';
    const intervalRaw = Number(req.body?.slideIntervalMs);
    const slideIntervalMs =
      Number.isFinite(intervalRaw) && intervalRaw >= 1500 && intervalRaw <= 10000
        ? Math.round(intervalRaw)
        : 3200;
    const durationRaw = Number(req.body?.durationSec);
    const durationSec =
      Number.isFinite(durationRaw) && durationRaw >= 1 && durationRaw <= 180
        ? Math.round(durationRaw)
        : mediaType === 'slideshow'
        ? Math.max(8, Math.round(((slideshowImages.length || 1) * slideIntervalMs) / 1000))
        : undefined;

    if (title.length < 3) {
      res.status(400).json({ error: 'Advertisement title must be at least 3 characters.' });
      return;
    }
    if (!videoUrl && slideshowImages.length === 0 && !isSafeImageUrl(req.body?.posterImageUrl)) {
      res.status(400).json({
        error:
          'Please upload a short video (MP4/WebM/MOV) or at least one photo for animated slideshow.',
      });
      return;
    }

    const effectiveSlides =
      mediaType === 'slideshow'
        ? slideshowImages.length > 0
          ? slideshowImages
          : [posterImageUrl]
        : slideshowImages.length > 0
        ? slideshowImages
        : undefined;

    const rawAppUrl = typeof req.body?.appUrl === 'string' ? req.body.appUrl.trim() : '';
    const appUrl = rawAppUrl ? isSafeExternalUrl(rawAppUrl) : undefined;
    if (rawAppUrl && !appUrl) {
      res.status(400).json({ error: 'App download link must be a valid https:// or http:// URL.' });
      return;
    }
    const appName = cleanStr(req.body?.appName, 80) || undefined;
    const displaySize: 'standard' | 'big' = req.body?.displaySize === 'big' ? 'big' : 'standard';

    const newAd: StoredAdVideo = {
      id: `ad-${crypto.randomUUID().slice(0, 8)}`,
      sellerId: user.id,
      sellerName: user.name,
      workshopName,
      title,
      caption: caption || title,
      ctaLabel,
      productId: linkedProduct?.id,
      mediaType,
      displaySize,
      videoUrl: mediaType === 'video' ? videoUrl : undefined,
      posterImageUrl,
      slideshowImages: effectiveSlides,
      slideIntervalMs,
      durationSec,
      appName,
      appUrl,
      status: req.body?.status === 'paused' ? 'paused' : 'active',
      views: 1,
      createdAt: new Date().toISOString(),
    };
    store.ads.unshift(newAd);
    saveStore();
    res.status(201).json({ ad: newAd });
  });

  function applyAdPatch(ad: StoredAdVideo, body: Record<string, unknown>, res: Response): boolean {
    if (typeof body?.title === 'string' && cleanStr(body.title, 100).length >= 3) {
      ad.title = cleanStr(body.title, 100);
    }
    if (typeof body?.caption === 'string' && cleanStr(body.caption, 300).length >= 2) {
      ad.caption = cleanStr(body.caption, 300);
    }
    if (typeof body?.ctaLabel === 'string' && cleanStr(body.ctaLabel, 40).length >= 2) {
      ad.ctaLabel = cleanStr(body.ctaLabel, 40);
    }
    if (typeof body?.workshopName === 'string' && cleanStr(body.workshopName, 90).length >= 2) {
      ad.workshopName = cleanStr(body.workshopName, 90);
    }
    if (body?.productId === '' || body?.productId === null) {
      ad.productId = undefined;
    } else if (typeof body?.productId === 'string') {
      const linked = store.products.find((p) => p.id === body.productId);
      if (linked) ad.productId = linked.id;
    }
    if (body?.appUrl === '' || body?.appUrl === null) {
      ad.appUrl = undefined;
    } else if (typeof body?.appUrl === 'string' && body.appUrl.trim()) {
      const safeApp = isSafeExternalUrl(body.appUrl);
      if (!safeApp) {
        res.status(400).json({ error: 'App download link must be a valid https:// or http:// URL.' });
        return false;
      }
      ad.appUrl = safeApp;
    }
    if (body?.appName === '' || body?.appName === null) {
      ad.appName = undefined;
    } else if (typeof body?.appName === 'string' && cleanStr(body.appName, 80).length >= 2) {
      ad.appName = cleanStr(body.appName, 80);
    }
    if (body?.displaySize === 'big' || body?.displaySize === 'standard') {
      ad.displaySize = body.displaySize;
    }
    if (Array.isArray(body?.slideshowImages)) {
      const sanitized = sanitizeSlideshowImages(body.slideshowImages);
      ad.slideshowImages = sanitized;
      if (sanitized.length > 0 && !isSafeImageUrl(body?.posterImageUrl)) {
        ad.posterImageUrl = sanitized[0];
      }
    }
    if (isSafeImageUrl(body?.posterImageUrl)) {
      ad.posterImageUrl = body.posterImageUrl;
    }
    if (isSafeVideoUrl(body?.videoUrl)) {
      ad.videoUrl = body.videoUrl;
    }
    if (body?.mediaType === 'slideshow' || body?.mediaType === 'video') {
      ad.mediaType = body.mediaType;
    }
    if (typeof body?.slideIntervalMs === 'number' && Number.isFinite(body.slideIntervalMs)) {
      ad.slideIntervalMs = Math.min(10000, Math.max(1500, Math.round(body.slideIntervalMs)));
    }
    if (body?.status === 'active' || body?.status === 'paused') {
      ad.status = body.status;
    }
    return true;
  }

  app.patch('/api/ads/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const ad = store.ads.find((a) => a.id === req.params.id);
    if (!ad) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }
    if (!applyAdPatch(ad, (req.body || {}) as Record<string, unknown>, res)) return;
    saveStore();
    res.json({ ad });
  });

  app.post('/api/ads/:id/view', (req, res) => {
    const ad = store.ads.find((a) => a.id === req.params.id);
    if (!ad) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }
    ad.views += 1;
    saveStore();
    res.json({ views: ad.views });
  });

  app.delete('/api/ads/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
    const idx = store.ads.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }
    const target = store.ads[idx];
    store.ads.splice(idx, 1);
    if (target.videoUrl && isSafeVideoUrl(target.videoUrl)) {
      const filename = path.basename(target.videoUrl);
      if (serverlessMode) {
        try {
          await getStore('jokeve-uploads').delete(filename);
        } catch {
          // ignore cleanup errors
        }
      } else {
        const filePath = path.resolve(uploadsDir, filename);
        if (filePath.startsWith(uploadsDir + path.sep) && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    saveStore();
    res.json({ ok: true });
  });

  // --- Full-Control Administrator Routes ---
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    res.json({
      products: [...store.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      orders: [...store.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      users: [...store.users]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(sanitizeUser),
      conversations: [...store.conversations].sort((a, b) =>
        b.lastMessageAt.localeCompare(a.lastMessageAt)
      ),
      ads: [...store.ads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      settings: store.settings,
    });
  });

  app.patch('/api/admin/ads/:id', requireAdmin, (req, res) => {
    const ad = store.ads.find((a) => a.id === req.params.id);
    if (!ad) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }
    if (!applyAdPatch(ad, (req.body || {}) as Record<string, unknown>, res)) return;
    saveStore();
    res.json({ ad });
  });

  app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
    const product = store.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    if (typeof req.body?.title === 'string' && cleanStr(req.body.title, 100).length >= 3) {
      product.title = cleanStr(req.body.title, 100);
    }
    if (typeof req.body?.titleRw === 'string' && cleanStr(req.body.titleRw, 100).length >= 3) {
      product.titleRw = cleanStr(req.body.titleRw, 100);
    }
    if (VALID_CATEGORIES.includes(req.body?.category)) {
      product.category = req.body.category;
    }
    if (['sale', 'rent', 'both'].includes(req.body?.listingMode)) {
      product.listingMode = req.body.listingMode;
    }
    if (
      typeof req.body?.priceRwf === 'number' &&
      Number.isFinite(req.body.priceRwf) &&
      req.body.priceRwf >= 500
    ) {
      product.priceRwf = Math.round(req.body.priceRwf);
    }
    if (
      typeof req.body?.rentalPricePerDayRwf === 'number' &&
      Number.isFinite(req.body.rentalPricePerDayRwf) &&
      req.body.rentalPricePerDayRwf >= 500
    ) {
      product.rentalPricePerDayRwf = Math.round(req.body.rentalPricePerDayRwf);
    }
    if (typeof req.body?.location === 'string' && cleanStr(req.body.location, 160).length >= 2) {
      product.location = cleanStr(req.body.location, 160);
      product.originCoords =
        sanitizeGeoLocation(req.body?.originCoords) || resolveCoordsForLocation(product.location);
    } else if (req.body?.originCoords) {
      const explicitOrigin = sanitizeGeoLocation(req.body.originCoords);
      if (explicitOrigin) {
        product.originCoords = explicitOrigin;
        product.location = explicitOrigin.label;
      }
    }
    if (typeof req.body?.momoCode === 'string' && cleanStr(req.body.momoCode, 40).length >= 3) {
      product.momoCode = cleanStr(req.body.momoCode, 40);
    }
    saveStore();
    res.json({ product });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    store.products.splice(idx, 1);
    saveStore();
    res.json({ ok: true });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (['pending', 'confirmed', 'in_craft', 'delivered', 'cancelled'].includes(req.body?.status)) {
      order.status = req.body.status;
    }
    if (
      typeof req.body?.agreedPriceRwf === 'number' &&
      Number.isFinite(req.body.agreedPriceRwf) &&
      req.body.agreedPriceRwf >= 0
    ) {
      order.agreedPriceRwf = Math.round(req.body.agreedPriceRwf);
    }
    const adminOrigin = sanitizeGeoLocation(req.body?.originCoords);
    if (adminOrigin) {
      order.originCoords = adminOrigin;
    }
    const adminDriver = sanitizeGeoLocation(req.body?.driverCoords);
    if (adminDriver) {
      order.driverCoords = adminDriver;
      order.driverLocationLabel = adminDriver.label;
      order.driverUpdatedAt = new Date().toISOString();
    }
    const adminBuyer = sanitizeGeoLocation(req.body?.buyerCoords);
    if (adminBuyer) {
      order.buyerCoords = adminBuyer;
      order.deliveryAddress = adminBuyer.label;
    }
    order.updatedAt = new Date().toISOString();
    saveStore();
    res.json({ order });
  });

  app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
    const user = store.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (req.body?.role === 'buyer' || req.body?.role === 'seller') {
      user.role = req.body.role;
    }
    if (req.body?.status === 'active' || req.body?.status === 'suspended') {
      user.status = req.body.status;
      if (req.body.status === 'suspended') {
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      }
    }
    if (req.body?.permissions && typeof req.body.permissions === 'object') {
      const current = getEffectivePermissions(user);
      const p = req.body.permissions as Record<string, unknown>;
      user.permissions = {
        canPostProducts:
          typeof p.canPostProducts === 'boolean' ? p.canPostProducts : current.canPostProducts,
        canPostAds: typeof p.canPostAds === 'boolean' ? p.canPostAds : current.canPostAds,
        canSendChat: typeof p.canSendChat === 'boolean' ? p.canSendChat : current.canSendChat,
        canPlaceOrders:
          typeof p.canPlaceOrders === 'boolean' ? p.canPlaceOrders : current.canPlaceOrders,
      };
    }
    if (req.body?.revokeSession === true) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
    saveStore();
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/admin/users/:id/revoke-session', requireAdmin, (req, res) => {
    const user = store.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    saveStore();
    res.json({ user: sanitizeUser(user) });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const idx = store.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const removed = store.users[idx];
    store.users.splice(idx, 1);
    delete store.wishlists[removed.id];
    saveStore();
    res.json({ ok: true });
  });

  app.delete('/api/admin/conversations/:id', requireAdmin, async (req, res) => {
    const convIdx = store.conversations.findIndex((c) => c.id === req.params.id);
    if (convIdx === -1) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    const convId = store.conversations[convIdx].id;
    const removedMsgs = store.messages.filter((m) => m.conversationId === convId);
    for (const m of removedMsgs) {
      if (m.audioUrl && isSafeAudioUrl(m.audioUrl)) {
        const filename = path.basename(m.audioUrl);
        if (serverlessMode) {
          try {
            await getStore('jokeve-uploads').delete(filename);
          } catch {
            // ignore unlink errors
          }
        } else {
          const audioPath = path.resolve(uploadsDir, filename);
          if (audioPath.startsWith(uploadsDir + path.sep) && fs.existsSync(audioPath)) {
            try {
              fs.unlinkSync(audioPath);
            } catch {
              // ignore unlink errors
            }
          }
        }
      }
    }
    store.messages = store.messages.filter((m) => m.conversationId !== convId);
    store.conversations.splice(convIdx, 1);
    saveStore();
    res.json({ ok: true });
  });

  app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
    const msgIdx = store.messages.findIndex((m) => m.id === req.params.id);
    if (msgIdx === -1) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }
    const target = store.messages[msgIdx];
    store.messages.splice(msgIdx, 1);
    if (target.audioUrl && isSafeAudioUrl(target.audioUrl)) {
      const stillUsed = store.messages.some((m) => m.audioUrl === target.audioUrl);
      if (!stillUsed) {
        const filename = path.basename(target.audioUrl);
        if (serverlessMode) {
          try {
            await getStore('jokeve-uploads').delete(filename);
          } catch {
            // ignore unlink errors
          }
        } else {
          const audioPath = path.resolve(uploadsDir, filename);
          if (audioPath.startsWith(uploadsDir + path.sep) && fs.existsSync(audioPath)) {
            try {
              fs.unlinkSync(audioPath);
            } catch {
              // ignore unlink errors
            }
          }
        }
      }
    }
    const conv = store.conversations.find((c) => c.id === target.conversationId);
    if (conv) {
      const remaining = store.messages
        .filter((m) => m.conversationId === conv.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const latest = remaining[remaining.length - 1];
      if (latest) {
        conv.lastMessage =
          latest.audioUrl && !latest.text
            ? '[Voice Note]'
            : latest.imageUrl && !latest.text
            ? '[Photo]'
            : latest.text;
        conv.lastMessageAt = latest.createdAt;
      } else {
        conv.lastMessage = 'Conversation opened';
      }
    }
    saveStore();
    res.json({ ok: true, conversation: conv });
  });

  app.patch('/api/admin/settings', requireAdmin, (req, res) => {
    if (
      typeof req.body?.platformName === 'string' &&
      cleanStr(req.body.platformName, 80).length >= 2
    ) {
      store.settings.platformName = cleanStr(req.body.platformName, 80);
    }
    if (
      typeof req.body?.defaultMomoCode === 'string' &&
      cleanStr(req.body.defaultMomoCode, 40).length >= 3
    ) {
      store.settings.defaultMomoCode = cleanStr(req.body.defaultMomoCode, 40);
    }
    if (
      typeof req.body?.defaultBankAccount === 'string' &&
      cleanStr(req.body.defaultBankAccount, 80).length >= 3
    ) {
      store.settings.defaultBankAccount = cleanStr(req.body.defaultBankAccount, 80);
    }
    if (
      typeof req.body?.supportPhone === 'string' &&
      cleanStr(req.body.supportPhone, 40).length >= 6
    ) {
      store.settings.supportPhone = cleanStr(req.body.supportPhone, 40);
    }
    if (typeof req.body?.adBannerTitle === 'string') {
      store.settings.adBannerTitle = cleanStr(req.body.adBannerTitle, 140);
    }
    if (typeof req.body?.adBannerText === 'string') {
      store.settings.adBannerText = cleanStr(req.body.adBannerText, 320);
    }
    saveStore();
    res.json({ settings: store.settings });
  });

  // Fallback 404 JSON for unknown /api/* paths so frontend gets clear JSON errors
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return { app, flushSaves };
}
