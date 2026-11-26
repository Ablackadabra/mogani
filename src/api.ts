import {
  AdVideo,
  ChatContact,
  ChatMessage,
  Conversation,
  GeoLocation,
  ListingMode,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
  Product,
  ProductCategory,
  PublicUser,
  SiteSettings,
  UserPermissions,
  UserRole,
} from './types';

const AUTH_TOKEN_KEY = 'jokeve_auth_token_v1';
const AUTH_USER_KEY = 'jokeve_auth_user_v1';
const VISITOR_ID_KEY = 'jokeve_visitor_id_v1';

export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const created = `v-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(VISITOR_ID_KEY, created);
    return created;
  } catch {
    return 'v-anon-session';
  }
}

function readStoredToken(): string | null {
  try {
    const val = localStorage.getItem(AUTH_TOKEN_KEY);
    return val && val.trim().length > 0 ? val : null;
  } catch {
    return null;
  }
}

export function readStoredUser(): PublicUser | null {
  try {
    if (!readStoredToken()) return null;
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PublicUser>;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return parsed as PublicUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredUser(user: PublicUser | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

let authToken: string | null = readStoredToken();

export function setAuthToken(token: string | null) {
  authToken = token;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function notifyIfAuthRevoked(status: number, message: string, hadToken: boolean) {
  if (!hadToken) return;
  const lower = message.toLowerCase();
  if (
    status === 401 ||
    (status === 403 && (lower.includes('suspended') || lower.includes('signed out') || lower.includes('revoked')))
  ) {
    window.dispatchEvent(new CustomEvent('jokeve:auth-revoked', { detail: { status, message } }));
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-visitor-id', getVisitorId());
  const hadToken = Boolean(authToken);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res
        .text()
        .then((txt) => {
          try {
            return JSON.parse(txt);
          } catch {
            return { _nonJson: true };
          }
        })
        .catch(() => ({ _nonJson: true }));
  if (!res.ok || data?._nonJson) {
    const errMsg =
      typeof data?.error === 'string'
        ? data.error
        : data?._nonJson
        ? `API backend (${url}) is not active on this host. Deploy using Git or Netlify CLI with netlify/functions enabled (not static dist-only drag-and-drop).`
        : `Request failed (${res.status})`;
    notifyIfAuthRevoked(res.status, errMsg, hadToken);
    throw new ApiError(errMsg, data?._nonJson ? 503 : res.status);
  }
  return data as T;
}

export async function fetchCurrentUser() {
  return apiFetch<{ user: PublicUser; token?: string }>('/api/auth/me');
}

export async function identifyAccount(identifier: string) {
  return apiFetch<{
    isAdminEmail: boolean;
    adminClaimed: boolean;
    envPasscodeConfigured: boolean;
  }>('/api/auth/identify', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

export async function adminLogin(payload: {
  email: string;
  password: string;
  emailVerified: boolean;
}) {
  return apiFetch<{ token: string; user: PublicUser }>('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Exclude<UserRole, 'admin'>;
  avatarUrl?: string;
  workshopName?: string;
  location?: string;
  momoCode?: string;
  bankAccount?: string;
}) {
  return apiFetch<{ token: string; user: PublicUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: { identifier: string; password: string }) {
  return apiFetch<{ token: string; user: PublicUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchProducts(category = 'all', q = '') {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (q.trim()) params.set('q', q.trim());
  const qs = params.toString();
  return apiFetch<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ''}`);
}

export async function fetchTrendingProducts() {
  return apiFetch<{ products: Product[] }>('/api/products/trending');
}

export async function toggleProductLike(id: string) {
  return apiFetch<{ product: Product; likesCount: number; liked: boolean }>(
    `/api/products/${encodeURIComponent(id)}/like`,
    { method: 'POST' }
  );
}

export async function createProduct(payload: {
  title: string;
  titleRw?: string;
  category: ProductCategory;
  listingMode?: ListingMode;
  priceRwf: number;
  rentalPricePerDayRwf?: number;
  material: string;
  dimensions: string;
  leadTimeDays: number;
  description: string;
  imageUrl: string;
  momoCode: string;
  phone: string;
  bankAccount: string;
  location: string;
}) {
  return apiFetch<{ product: Product }>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  id: string,
  payload: Partial<{
    title: string;
    titleRw: string;
    category: ProductCategory;
    listingMode: ListingMode;
    priceRwf: number;
    rentalPricePerDayRwf: number | null;
    material: string;
    dimensions: string;
    leadTimeDays: number;
    description: string;
    descriptionRw: string;
    imageUrl: string;
    momoCode: string;
    phone: string;
    bankAccount: string;
    location: string;
  }>
) {
  return apiFetch<{ product: Product }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(
  payload: Partial<{
    name: string;
    avatarUrl: string;
    workshopName: string;
    location: string;
    momoCode: string;
    bankAccount: string;
  }>
) {
  return apiFetch<{ user: PublicUser }>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchOrders() {
  return apiFetch<{ orders: Order[] }>('/api/orders');
}

export async function createOrder(payload: {
  orderType: OrderType;
  productId?: string;
  sellerId?: string;
  sellerName?: string;
  workshopName?: string;
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
  distanceKm?: number;
  agreedPriceRwf: number;
  paymentMethod: PaymentMethod;
  paymentRef: string;
  buyerPhone?: string;
}) {
  return apiFetch<{ order: Order }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOrderStatus(id: string, status?: OrderStatus, paymentRef?: string) {
  return apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, paymentRef }),
  });
}

export async function shareOrderDriverLocation(
  id: string,
  payload: { lat: number; lng: number; label: string }
) {
  return apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/location`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateOrderOrigin(
  id: string,
  payload: { lat: number; lng: number; label: string }
) {
  return apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/origin`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchChatContacts() {
  return apiFetch<{ contacts: ChatContact[] }>('/api/chat/contacts');
}

export async function fetchConversations() {
  return apiFetch<{ conversations: Conversation[] }>('/api/conversations');
}

export async function openConversation(payload: {
  targetUserId?: string;
  productId?: string;
  sellerId?: string;
  sellerName?: string;
  workshopName?: string;
  productTitle?: string;
  productImageUrl?: string;
  forceNew?: boolean;
}) {
  return apiFetch<{ conversation: Conversation; messages: ChatMessage[] }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMessages(conversationId: string) {
  return apiFetch<{ conversation: Conversation; messages: ChatMessage[] }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`
  );
}

export async function uploadChatAudioFile(blob: Blob): Promise<{ audioUrl: string }> {
  const headers = new Headers();
  const contentType = blob.type ? blob.type.split(';')[0].trim() : 'audio/webm';
  headers.set('Content-Type', contentType);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  const res = await fetch('/api/chat/audio', {
    method: 'POST',
    headers,
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : `Audio upload failed (${res.status})`
    );
  }
  return data as { audioUrl: string };
}

export async function sendChatMessage(
  conversationId: string,
  payload: {
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDurationSec?: number;
    offerPriceRwf?: number;
  }
) {
  return apiFetch<{ message: ChatMessage; conversation: Conversation }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// --- Admin Full Control APIs ---
export async function fetchAdminOverview() {
  return apiFetch<{
    products: Product[];
    orders: Order[];
    users: PublicUser[];
    conversations: Conversation[];
    ads: AdVideo[];
    settings: SiteSettings;
  }>('/api/admin/overview');
}

export async function adminUpdateProduct(
  id: string,
  payload: Partial<
    Pick<
      Product,
      | 'title'
      | 'titleRw'
      | 'category'
      | 'listingMode'
      | 'priceRwf'
      | 'rentalPricePerDayRwf'
      | 'location'
      | 'originCoords'
      | 'momoCode'
    >
  >
) {
  return apiFetch<{ product: Product }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteProduct(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function adminUpdateOrder(
  id: string,
  payload: {
    status?: OrderStatus;
    agreedPriceRwf?: number;
    originCoords?: GeoLocation;
    driverCoords?: GeoLocation;
    buyerCoords?: GeoLocation;
  }
) {
  return apiFetch<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateUser(
  id: string,
  payload: {
    role?: 'buyer' | 'seller';
    status?: 'active' | 'suspended';
    permissions?: Partial<UserPermissions>;
    revokeSession?: boolean;
  }
) {
  return apiFetch<{ user: PublicUser }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminRevokeUserSession(id: string) {
  return apiFetch<{ user: PublicUser }>(
    `/api/admin/users/${encodeURIComponent(id)}/revoke-session`,
    { method: 'POST' }
  );
}

export async function adminDeleteUser(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function adminDeleteConversation(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function adminDeleteMessage(id: string) {
  return apiFetch<{ ok: boolean; conversation?: Conversation }>(
    `/api/admin/messages/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

export async function adminUpdateSettings(payload: Partial<SiteSettings>) {
  return apiFetch<{ settings: SiteSettings }>('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// --- Short-Video Advertisement APIs ---
export async function fetchAds() {
  return apiFetch<{ ads: AdVideo[]; adBannerTitle?: string; adBannerText?: string }>('/api/ads');
}

export async function uploadAdVideoFile(file: File): Promise<{ videoUrl: string }> {
  const headers = new Headers();
  headers.set('Content-Type', file.type || 'video/mp4');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  const res = await fetch('/api/ads/upload', {
    method: 'POST',
    headers,
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Video upload failed (${res.status})`);
  }
  return data as { videoUrl: string };
}

export async function createAd(payload: {
  title: string;
  caption: string;
  ctaLabel?: string;
  workshopName?: string;
  productId?: string;
  mediaType?: 'video' | 'slideshow';
  displaySize?: 'standard' | 'big';
  videoUrl?: string;
  posterImageUrl?: string;
  slideshowImages?: string[];
  slideIntervalMs?: number;
  durationSec?: number;
  appName?: string;
  appUrl?: string;
  status?: 'active' | 'paused';
}) {
  return apiFetch<{ ad: AdVideo }>('/api/ads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recordAdView(id: string) {
  return apiFetch<{ views: number }>(`/api/ads/${encodeURIComponent(id)}/view`, {
    method: 'POST',
  });
}

export async function deleteAd(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/ads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateAd(
  id: string,
  payload: Partial<{
    title: string;
    caption: string;
    ctaLabel: string;
    workshopName: string;
    productId: string;
    mediaType: 'video' | 'slideshow';
    displaySize: 'standard' | 'big';
    posterImageUrl: string;
    slideshowImages: string[];
    slideIntervalMs: number;
    videoUrl: string;
    appName: string;
    appUrl: string;
    status: 'active' | 'paused';
  }>
) {
  return apiFetch<{ ad: AdVideo }>(`/api/ads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateAd(
  id: string,
  payload: Partial<{
    title: string;
    caption: string;
    ctaLabel: string;
    workshopName: string;
    productId: string;
    mediaType: 'video' | 'slideshow';
    displaySize: 'standard' | 'big';
    posterImageUrl: string;
    slideshowImages: string[];
    slideIntervalMs: number;
    videoUrl: string;
    appName: string;
    appUrl: string;
    status: 'active' | 'paused';
  }>
) {
  return apiFetch<{ ad: AdVideo }>(`/api/admin/ads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// --- Persistent Wishlist APIs ---
export async function fetchWishlist() {
  return apiFetch<{ productIds: string[] }>('/api/wishlist');
}

export async function toggleWishlistItem(productId: string) {
  return apiFetch<{ productIds: string[]; saved: boolean }>('/api/wishlist', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export async function syncWishlist(productIds: string[]) {
  return apiFetch<{ productIds: string[] }>('/api/wishlist/sync', {
    method: 'PUT',
    body: JSON.stringify({ productIds }),
  });
}

export async function removeWishlistItem(productId: string) {
  return apiFetch<{ productIds: string[] }>(`/api/wishlist/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}

