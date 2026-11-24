export type Language = 'rw' | 'en' | 'fr' | 'sw' | 'es' | 'ar' | 'de' | 'pt' | 'zh';

export type UserRole = 'buyer' | 'seller' | 'admin';

export type ProductCategory =
  | 'sofas'
  | 'dining'
  | 'accent'
  | 'office'
  | 'wardrobes'
  | 'beds'
  | 'rentals';

export type ListingMode = 'sale' | 'rent' | 'both';

export type PaymentMethod = 'momo_code' | 'phone' | 'bank' | 'cod';

export type OrderType = 'purchase' | 'custom' | 'repair' | 'rent';

export type OrderStatus = 'pending' | 'confirmed' | 'in_craft' | 'delivered' | 'cancelled';

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface UserPermissions {
  canPostProducts: boolean;
  canPostAds: boolean;
  canSendChat: boolean;
  canPlaceOrders: boolean;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'suspended';
  avatarUrl?: string;
  workshopName?: string;
  location?: string;
  momoCode?: string;
  bankAccount?: string;
  permissions?: UserPermissions;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  workshopName: string;
  location: string;
  originCoords: GeoLocation;
  title: string;
  titleRw: string;
  category: ProductCategory;
  listingMode: ListingMode;
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
  likesCount?: number;
  wishlistCount?: number;
  ordersCount?: number;
  popularityScore?: number;
  likedByViewer?: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  orderType: OrderType;
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
  paymentMethod: PaymentMethod;
  paymentRef: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
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

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatarUrl?: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  offerPriceRwf?: number;
  createdAt: string;
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

export interface AdVideo {
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

export interface ChatContact {
  id: string;
  name: string;
  role: UserRole;
  workshopName?: string;
  location?: string;
  avatarUrl?: string;
}

