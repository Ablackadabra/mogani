import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Armchair,
  ClipboardList,
  Users,
  MessageSquare,
  Settings,
  Trash2,
  ArrowLeft,
  Save,
  Plus,
  LocateFixed,
  Video,
  Pause,
  Play,
  Pencil,
  LogOut,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import { ChatInbox } from './ChatInbox';
import { ProductEditorModal } from './ProductEditorModal';
import { AdEditorForm } from './AdShowcaseSection';
import { RwandaLocationPicker } from './RwandaLocationPicker';
import {
  AdVideo,
  Conversation,
  GeoLocation,
  Language,
  ListingMode,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  PublicUser,
  SiteSettings,
  UserPermissions,
} from '../types';
import {
  adminDeleteProduct,
  adminDeleteUser,
  adminRevokeUserSession,
  adminUpdateAd,
  adminUpdateOrder,
  adminUpdateProduct,
  adminUpdateSettings,
  adminUpdateUser,
  createProduct,
  deleteAd,
  fetchAdminOverview,
  shareOrderDriverLocation,
  updateOrderOrigin,
} from '../api';
import { compressImageFile, formatRwf } from '../utils/image';
import { DeliveryMap, KIGALI_ZONES } from './DeliveryMap';

interface AdminDashboardProps {
  lang: Language;
  user: PublicUser;
  onExitToStorefront: () => void;
  onProductsChanged: (products: Product[]) => void;
  onAdsChanged?: (ads: AdVideo[]) => void;
  onBannerChanged?: (title: string, text: string) => void;
  onUserUpdated?: (user: PublicUser) => void;
}

type AdminTab = 'overview' | 'products' | 'orders' | 'users' | 'chats' | 'ads' | 'settings';

export function AdminDashboard({
  lang,
  user,
  onExitToStorefront,
  onProductsChanged,
  onAdsChanged,
  onBannerChanged,
  onUserUpdated,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [editingFullProduct, setEditingFullProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [ads, setAds] = useState<AdVideo[]>([]);
  const [adEditorOpen, setAdEditorOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdVideo | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({
    platformName: 'JOKEVE FURNITURE',
    adminEmail: '',
    defaultMomoCode: '',
    defaultBankAccount: '',
    supportPhone: '',
    adBannerTitle: '',
    adBannerText: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Admin Transport & Live Map state
  const [selectedMapOrderId, setSelectedMapOrderId] = useState<string>('');
  const [selectedMapProductId, setSelectedMapProductId] = useState<string>('');
  const [adminMapBuyerPreview, setAdminMapBuyerPreview] = useState<GeoLocation>(KIGALI_ZONES[1]);
  const [savingBannerSettings, setSavingBannerSettings] = useState(false);

  // Quick editing state per product
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  const [editingRentalRate, setEditingRentalRate] = useState<Record<string, string>>({});
  const [editingMode, setEditingMode] = useState<Record<string, ListingMode>>({});
  const [driverZoneIdx, setDriverZoneIdx] = useState<Record<string, number>>({});

  // Admin quick Add Product state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('wardrobes');
  const [newListingMode, setNewListingMode] = useState<ListingMode>('sale');
  const [newPrice, setNewPrice] = useState('450000');
  const [newRentalPrice, setNewRentalPrice] = useState('1500');
  const [newImage, setNewImage] = useState('/src/assets/images/wardrobe_cabinet_walnut_1795441272016.jpg');
  const [addingProduct, setAddingProduct] = useState(false);

  async function loadAll(silent = false) {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const res = await fetchAdminOverview();
      setProducts(res.products);
      setOrders(res.orders);
      setUsers(res.users);
      setConversations(res.conversations);
      setAds(res.ads || []);
      if (!silent) {
        setSettings(res.settings);
      }
      onProductsChanged(res.products);
      onAdsChanged?.((res.ads || []).filter((a) => a.status === 'active'));
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load administrator console.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadAll(false);
    const timer = setInterval(() => {
      loadAll(true);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const totalConfirmedRwf = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.agreedPriceRwf, 0);

  async function handleSaveProduct(p: Product) {
    const priceVal = Number(editingPrice[p.id] ?? p.priceRwf);
    const rentalVal = Number(editingRentalRate[p.id] ?? p.rentalPricePerDayRwf ?? 0);
    const modeVal = editingMode[p.id] ?? p.listingMode;
    try {
      const res = await adminUpdateProduct(p.id, {
        priceRwf: Number.isFinite(priceVal) && priceVal >= 500 ? priceVal : p.priceRwf,
        rentalPricePerDayRwf:
          Number.isFinite(rentalVal) && rentalVal >= 500 ? rentalVal : undefined,
        listingMode: modeVal,
      });
      const next = products.map((item) => (item.id === p.id ? res.product : item));
      setProducts(next);
      onProductsChanged(next);
      setNotice(`Updated ${res.product.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleAdminCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAddingProduct(true);
    setError('');
    try {
      const res = await createProduct({
        title: newTitle.trim(),
        titleRw: newTitle.trim(),
        category: newCategory,
        listingMode: newListingMode,
        priceRwf: Number(newPrice) || 100000,
        rentalPricePerDayRwf:
          newListingMode === 'rent' || newListingMode === 'both'
            ? Number(newRentalPrice) || 1500
            : undefined,
        material: 'Hardwood / Crafted Studio Finish',
        dimensions: 'Standard',
        leadTimeDays: 5,
        description: newTitle.trim(),
        imageUrl: newImage,
        momoCode: settings.defaultMomoCode,
        phone: settings.supportPhone,
        bankAccount: settings.defaultBankAccount,
        location: 'Kigali, Rwanda',
      });
      const next = [res.product, ...products];
      setProducts(next);
      onProductsChanged(next);
      setNewTitle('');
      setNotice(`Added "${res.product.title}" to catalog.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product.');
    } finally {
      setAddingProduct(false);
    }
  }

  async function handleAdminUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setNewImage(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load image.');
    }
  }

  async function handleDeleteProduct(id: string) {
    try {
      await adminDeleteProduct(id);
      const next = products.filter((p) => p.id !== id);
      setProducts(next);
      onProductsChanged(next);
      setNotice('Listing removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleOrderStatusChange(id: string, status: OrderStatus) {
    try {
      const res = await adminUpdateOrder(id, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? res.order : o)));
      setNotice(`Order ${id} updated to ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order update failed.');
    }
  }

  async function handleAdminShareDriverLoc(orderId: string, customCoords?: GeoLocation) {
    const idx = driverZoneIdx[orderId] ?? 0;
    const zone = customCoords || KIGALI_ZONES[idx] || KIGALI_ZONES[0];
    try {
      const res = await shareOrderDriverLocation(orderId, {
        lat: zone.lat,
        lng: zone.lng,
        label: zone.label,
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      setNotice(
        lang === 'rw'
          ? `Aho igicuruzwa kigeze (${orderId}) hashyizwe kuri ${zone.label}.`
          : `Courier location for ${orderId} updated to ${zone.label}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update courier location.');
    }
  }

  async function handleAdminSetOrderOrigin(orderId: string, coords: GeoLocation) {
    setError('');
    try {
      const res = await updateOrderOrigin(orderId, {
        lat: coords.lat,
        lng: coords.lng,
        label: coords.label,
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      setNotice(
        lang === 'rw'
          ? `Aho igicuruzwa kirimo kuva kuri ${orderId} hashyizwe kuri ${coords.label}.`
          : `Dispatch origin for ${orderId} updated to ${coords.label}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dispatch origin.');
    }
  }

  async function handleAdminSetProductOrigin(productId: string, coords: GeoLocation) {
    setError('');
    try {
      const res = await adminUpdateProduct(productId, {
        location: coords.label,
        originCoords: coords,
      });
      const next = products.map((p) => (p.id === productId ? res.product : p));
      setProducts(next);
      onProductsChanged(next);
      setNotice(
        lang === 'rw'
          ? `Aho "${res.product.title}" irimo kuva hashyizwe kuri ${coords.label}.`
          : `Origin for "${res.product.title}" updated to ${coords.label}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product origin.');
    }
  }

  async function handleToggleUserStatus(u: PublicUser) {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await adminUpdateUser(u.id, { status: nextStatus });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? res.user : item)));
      setNotice(
        nextStatus === 'suspended'
          ? `${u.name} yasubitswe inyuma kandi yakuwe muri login.`
          : `${u.name} yongeye gufungurirwa.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User update failed.');
    }
  }

  async function handleToggleUserRole(u: PublicUser) {
    const nextRole = u.role === 'seller' ? 'buyer' : 'seller';
    try {
      const res = await adminUpdateUser(u.id, { role: nextRole });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? res.user : item)));
      setNotice(`${u.name} role changed to ${nextRole}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed.');
    }
  }

  async function handleRevokeUserSession(u: PublicUser) {
    try {
      const res = await adminRevokeUserSession(u.id);
      setUsers((prev) => prev.map((item) => (item.id === u.id ? res.user : item)));
      setNotice(
        lang === 'rw'
          ? `${u.name} yakuwe muri login ako kanya.`
          : `${u.name} was signed out immediately.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign user out.');
    }
  }

  async function handleTogglePermission(u: PublicUser, key: keyof UserPermissions) {
    const current = u.permissions?.[key] !== false;
    try {
      const res = await adminUpdateUser(u.id, {
        permissions: { [key]: !current },
      });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? res.user : item)));
      setNotice(`${u.name}: ${key} ${!current ? 'allowed' : 'restricted'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission update failed.');
    }
  }

  async function handleDeleteUser(u: PublicUser) {
    try {
      await adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
      setConfirmDeleteUserId(null);
      setNotice(
        lang === 'rw'
          ? `Konti ya ${u.name} yasibwe burundu.`
          : `User account "${u.name}" permanently deleted.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User deletion failed.');
    }
  }

  function formatShortDateTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await adminUpdateSettings(settings);
      setSettings(res.settings);
      setNotice('Platform settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settings update failed.');
    }
  }

  async function handleToggleAdStatus(ad: AdVideo) {
    const nextStatus = ad.status === 'active' ? 'paused' : 'active';
    try {
      const res = await adminUpdateAd(ad.id, { status: nextStatus });
      const next = ads.map((a) => (a.id === ad.id ? res.ad : a));
      setAds(next);
      onAdsChanged?.(next.filter((a) => a.status === 'active'));
      setNotice(`Ad "${res.ad.title}" marked ${nextStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ad status update failed.');
    }
  }

  async function handleAdminDeleteAd(ad: AdVideo) {
    try {
      await deleteAd(ad.id);
      const next = ads.filter((a) => a.id !== ad.id);
      setAds(next);
      onAdsChanged?.(next.filter((a) => a.status === 'active'));
      setNotice(`Ad "${ad.title}" removed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ad.');
    }
  }

  const navItems: { id: AdminTab; label: string; count?: number; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: lang === 'rw' ? 'Incamake (Overview)' : 'Overview', icon: LayoutDashboard },
    { id: 'products', label: lang === 'rw' ? 'Ibicuruzwa & Gukodesha' : 'Products & Rentals', count: products.length, icon: Armchair },
    { id: 'orders', label: lang === 'rw' ? 'Transport, Command & Map' : 'Transport, Orders & Map', count: orders.length, icon: ClipboardList },
    { id: 'users', label: lang === 'rw' ? 'Abiyandikishije & Ububasha' : 'Users & Permissions', count: users.length, icon: Users },
    { id: 'chats', label: lang === 'rw' ? 'Uruganiriro' : 'Uruganiriro', count: conversations.length, icon: MessageSquare },
    { id: 'ads', label: lang === 'rw' ? 'Ibyamamaza (Ads)' : 'Video Ads', count: ads.length, icon: Video },
    { id: 'settings', label: lang === 'rw' ? 'Igenamiterere' : 'Settings', icon: Settings },
  ];

  const activeMapOrder =
    orders.find((o) => o.id === selectedMapOrderId) || orders[0] || null;
  const activeMapProduct =
    products.find((p) => p.id === selectedMapProductId) || products[0] || null;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0F172A] text-slate-100 shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="px-5 py-5 border-b border-slate-800">
            <p className="text-xs font-medium text-[#E5B748]">JOKEVE FURNITURE</p>
            <h1 className="text-base font-semibold text-white mt-0.5">Administrator Console</h1>
            <p className="text-[11px] font-mono text-slate-400 truncate mt-1">
              {settings.adminEmail}
            </p>
          </div>

          <nav className="p-2 sm:p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`lg:w-full flex items-center justify-between gap-2.5 lg:gap-3 px-3.5 py-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#7C4D25] text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && (
                    <span className={`font-mono tabular-nums text-[11px] ${active ? 'text-white/90' : 'text-slate-400'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onExitToStorefront}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 rounded-md hover:bg-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'rw' ? 'Subira ku Rubuga' : 'Return to Storefront'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Admin Console</span>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-slate-900 capitalize">{tab}</span>
          </div>
          <button
            type="button"
            onClick={() => loadAll(false)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
          >
            Refresh Data
          </button>
        </div>

        <div className="p-6 space-y-6 max-w-6xl">
          {error && (
            <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice('')}
                className="text-emerald-700 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Overview KPI Strip */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-500">Catalog & Rental Items</p>
                      <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                        {products.length}
                      </p>
                    </div>
                    <div className="p-5 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-500">Orders, Rentals & Repairs</p>
                      <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                        {orders.length}
                      </p>
                    </div>
                    <div className="p-5 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-500">Registered Accounts</p>
                      <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                        {users.length}
                      </p>
                    </div>
                    <div className="p-5 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-500">Order Volume</p>
                      <p className="text-xl font-semibold font-mono tabular-nums text-[#7C4D25] mt-1">
                        {formatRwf(totalConfirmedRwf)}
                      </p>
                    </div>
                  </div>

                  {/* Recent Orders Table */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900">Recent Orders & Repairs</h2>
                      <button
                        type="button"
                        onClick={() => setTab('orders')}
                        className="text-xs font-medium text-[#7C4D25] hover:underline cursor-pointer"
                      >
                        Manage All
                      </button>
                    </div>
                    {orders.length === 0 ? (
                      <p className="p-6 text-xs text-slate-500">No orders placed yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-4 font-medium">Order ID</th>
                              <th className="py-2.5 px-4 font-medium">Type</th>
                              <th className="py-2.5 px-4 font-medium">Customer</th>
                              <th className="py-2.5 px-4 font-medium">Item / Courier</th>
                              <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                              <th className="py-2.5 px-4 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {orders.slice(0, 6).map((o) => (
                              <tr key={o.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-4 font-mono text-slate-700">{o.id}</td>
                                <td className="py-2.5 px-4 capitalize text-slate-600">{o.orderType}</td>
                                <td className="py-2.5 px-4 text-slate-900">{o.buyerName}</td>
                                <td className="py-2.5 px-4 text-slate-600 truncate max-w-[240px]">
                                  {o.productTitle}
                                  {o.driverLocationLabel ? ` · ${o.driverLocationLabel}` : ''}
                                </td>
                                <td className="py-2.5 px-4 font-mono tabular-nums text-right text-slate-900">
                                  {formatRwf(o.agreedPriceRwf)}
                                </td>
                                <td className="py-2.5 px-4 capitalize font-medium text-slate-800">
                                  {o.status.replace('_', ' ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Newly Registered Users & Recent Sign-Ins (Auto-Updated Live) */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          {lang === 'rw'
                            ? 'Abiyandikishije Vuba & Abakoresha Bahari'
                            : 'Newly Registered Users & Recent Sign-Ins'}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'rw'
                            ? 'Iyandikisha rishya rihita rigaragara hano ako kanya nta gukanda Refresh.'
                            : 'New sign-ups and sign-ins appear automatically every few seconds.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab('users')}
                        className="text-xs font-medium text-[#7C4D25] hover:underline cursor-pointer"
                      >
                        {lang === 'rw' ? 'Genga Ububasha Bose' : 'Manage Permissions'}
                      </button>
                    </div>
                    {users.length === 0 ? (
                      <p className="p-6 text-xs text-slate-500">No users registered yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-4 font-medium">Account</th>
                              <th className="py-2.5 px-4 font-medium">Contact</th>
                              <th className="py-2.5 px-4 font-medium">Role & Status</th>
                              <th className="py-2.5 px-4 font-medium">Registered</th>
                              <th className="py-2.5 px-4 font-medium">Last Login</th>
                              <th className="py-2.5 px-4 font-medium text-right">Quick Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {users.slice(0, 8).map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-4 font-medium text-slate-900">
                                  {u.name}
                                  {u.workshopName ? (
                                    <span className="block text-[11px] font-normal text-slate-500">
                                      {u.workshopName}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-600">
                                  {u.phone}
                                  <span className="block text-[11px] text-slate-500">{u.email}</span>
                                </td>
                                <td className="py-2.5 px-4 capitalize">
                                  <span className="text-slate-700 font-medium">{u.role}</span>
                                  <span
                                    className={`ml-2 font-medium ${
                                      u.status === 'active' ? 'text-emerald-700' : 'text-red-600'
                                    }`}
                                  >
                                    · {u.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-600">
                                  {formatShortDateTime(u.createdAt)}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-600">
                                  {formatShortDateTime(u.lastLoginAt || u.createdAt)}
                                </td>
                                <td className="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeUserSession(u)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-amber-300 bg-amber-50 text-amber-900 rounded hover:bg-amber-100 cursor-pointer"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>{lang === 'rw' ? 'Kuraho Login' : 'Kick / Sign Out'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTab('users')}
                                    className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                                  >
                                    {lang === 'rw' ? 'Ububasha' : 'Access'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Products Management + Admin Add Listing */}
              {tab === 'products' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleAdminCreateProduct}
                    className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Plus className="w-4 h-4 text-[#7C4D25]" />
                      <span>Add New Furniture / Rental Item (Admin Direct Publish)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          required
                          placeholder="Garde-robe / Plastic Chairs / Hardwood Bed"
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Category
                        </label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value="wardrobes">Wardrobes & Cabinets</option>
                          <option value="beds">Beds</option>
                          <option value="sofas">Sofas</option>
                          <option value="dining">Dining Tables</option>
                          <option value="accent">Accent Chairs</option>
                          <option value="office">Office</option>
                          <option value="rentals">Rentals (Plastic)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Mode
                        </label>
                        <select
                          value={newListingMode}
                          onChange={(e) => setNewListingMode(e.target.value as ListingMode)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value="sale">Sale Only</option>
                          <option value="rent">Rent Only</option>
                          <option value="both">Sale & Rent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Price / Rent (RWF)
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded"
                            placeholder="Sale"
                          />
                          {(newListingMode === 'rent' || newListingMode === 'both') && (
                            <input
                              type="number"
                              value={newRentalPrice}
                              onChange={(e) => setNewRentalPrice(e.target.value)}
                              className="w-20 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded"
                              placeholder="/day"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer whitespace-nowrap">
                          Photo
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleAdminUploadImage}
                            className="sr-only"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={addingProduct}
                          className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#7C4D25] text-white rounded hover:bg-[#633D1D] cursor-pointer whitespace-nowrap"
                        >
                          {addingProduct ? '...' : 'Publish'}
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200">
                      <h2 className="text-sm font-semibold text-slate-900">
                        All Furniture & Rental Listings ({products.length})
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 font-medium">Product</th>
                            <th className="py-2.5 px-4 font-medium">Category & Mode</th>
                            <th className="py-2.5 px-4 font-medium">Sale Price (RWF)</th>
                            <th className="py-2.5 px-4 font-medium">Daily Rent (RWF)</th>
                            <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {products.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={p.imageUrl}
                                    alt={p.title}
                                    className="w-11 h-9 object-cover rounded bg-slate-100 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-900 truncate max-w-[200px]">
                                      {p.title}
                                    </p>
                                    <p className="text-[11px] text-slate-500">{p.workshopName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="capitalize text-slate-600">{p.category}</span>
                                  <select
                                    value={editingMode[p.id] ?? p.listingMode}
                                    onChange={(e) =>
                                      setEditingMode((prev) => ({
                                        ...prev,
                                        [p.id]: e.target.value as ListingMode,
                                      }))
                                    }
                                    className="px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                                  >
                                    <option value="sale">Sale</option>
                                    <option value="rent">Rent</option>
                                    <option value="both">Both</option>
                                  </select>
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <input
                                  type="number"
                                  value={editingPrice[p.id] ?? String(p.priceRwf)}
                                  onChange={(e) =>
                                    setEditingPrice((prev) => ({ ...prev, [p.id]: e.target.value }))
                                  }
                                  className="w-28 px-2 py-1 font-mono text-xs border border-slate-300 rounded tabular-nums"
                                />
                              </td>
                              <td className="py-2.5 px-4">
                                <input
                                  type="number"
                                  value={editingRentalRate[p.id] ?? String(p.rentalPricePerDayRwf || '')}
                                  placeholder="—"
                                  onChange={(e) =>
                                    setEditingRentalRate((prev) => ({
                                      ...prev,
                                      [p.id]: e.target.value,
                                    }))
                                  }
                                  className="w-24 px-2 py-1 font-mono text-xs border border-slate-300 rounded tabular-nums"
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleSaveProduct(p)}
                                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-white rounded hover:bg-slate-700 cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingFullProduct(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-slate-300 text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Full Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="inline-flex items-center gap-1 text-red-600 hover:underline cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Transport, Live Rwanda Map & Orders Origin/Transit Control */}
              {tab === 'orders' && (
                <div className="space-y-6">
                  {/* Live Transport Map + Admin Origin ("Aho kiva") & Transit Controls */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          {lang === 'rw'
                            ? 'Transport & Map Live · Shyiramo Aho Igicuruzwa Kirimo Kuva Ubirebe kuri Map'
                            : 'Transport & Live Rwanda Map · Set Product Dispatch Origin & Track Anywhere'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {lang === 'rw'
                            ? 'Hitamo command cyangwa igicuruzwa, wandike Intara/Akarere/Umurenge/Akagari/Umudugudu kirimo kuva, uhite ubibona kuri map mu Rwanda hose.'
                            : 'Select any order or product, set exact Province/District/Sector/Cell/Village origin and transit point, and see it plotted live across Rwanda.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {orders.length > 0 && (
                          <select
                            aria-label="Select order for map tracking"
                            value={activeMapOrder?.id || ''}
                            onChange={(e) => setSelectedMapOrderId(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 max-w-[240px]"
                          >
                            {orders.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.id} · {o.buyerName} ({o.productTitle})
                              </option>
                            ))}
                          </select>
                        )}
                        {products.length > 0 && (
                          <select
                            aria-label="Select product origin on map"
                            value={activeMapProduct?.id || ''}
                            onChange={(e) => setSelectedMapProductId(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 max-w-[220px]"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {lang === 'rw' ? p.titleRw : p.title} ({p.location})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Panel 1: Admin enters WHERE THE PRODUCT IS COMING FROM ("Aho igicuruzwa kirimo kuva") */}
                      <RwandaLocationPicker
                        lang={lang}
                        title={
                          lang === 'rw'
                            ? activeMapOrder
                              ? `Aho Igicuruzwa Kirimo Kuva (${activeMapOrder.id})`
                              : `Aho Igicuruzwa Kirimo Kuva (${activeMapProduct?.title || 'Catalog'})`
                            : activeMapOrder
                            ? `Where Product Is Coming From (${activeMapOrder.id})`
                            : 'Where Product Is Coming From (Origin)'
                        }
                        subtitle={
                          lang === 'rw'
                            ? 'Admin ashyiramo Intara, Akarere, Umurenge, Akagari n’Umudugudu igicuruzwa kirimo kuva:'
                            : 'Administrator enters Province, District, Sector, Cell & Village of dispatch origin:'
                        }
                        actionButtonLabel={
                          lang === 'rw' ? 'Shyiraho Aho Kiva (Map)' : 'Set Origin & Show on Map'
                        }
                        onLocationChange={() => {}}
                        onActionSubmit={(_addr, coords) => {
                          if (activeMapOrder) {
                            handleAdminSetOrderOrigin(activeMapOrder.id, coords);
                            if (activeMapOrder.productId) {
                              handleAdminSetProductOrigin(activeMapOrder.productId, coords);
                            }
                          } else if (activeMapProduct) {
                            handleAdminSetProductOrigin(activeMapProduct.id, coords);
                          }
                        }}
                      />

                      {/* Panel 2: Admin updates LIVE TRANSIT ("Aho Kigeze Ubu") or Test Buyer Destination */}
                      {activeMapOrder ? (
                        <RwandaLocationPicker
                          lang={lang}
                          title={
                            lang === 'rw'
                              ? `Aho Igicuruzwa / Umushoferi Kigeze Ubu (${activeMapOrder.id})`
                              : `Live Transit / Courier Position (${activeMapOrder.id})`
                          }
                          subtitle={
                            lang === 'rw'
                              ? `Umukiriya (${activeMapOrder.buyerName}) yanditse ko kijya: ${activeMapOrder.deliveryAddress}`
                              : `Customer destination: ${activeMapOrder.deliveryAddress}`
                          }
                          actionButtonLabel={
                            lang === 'rw' ? 'Emeza Aho Kigeze kuri Map' : 'Update Transit Pin on Map'
                          }
                          onLocationChange={() => {}}
                          onActionSubmit={(_addr, coords) => {
                            handleAdminShareDriverLoc(activeMapOrder.id, coords);
                          }}
                        />
                      ) : (
                        <RwandaLocationPicker
                          lang={lang}
                          title={
                            lang === 'rw'
                              ? 'Aho Umukiriya Ashaka ko Kijya (Preview ku Ikarita)'
                              : 'Destination Preview (Check Route Anywhere in Rwanda)'
                          }
                          subtitle={
                            lang === 'rw'
                              ? 'Umuntu ku giti cye yandika Intara/Umurenge/Umudugudu we aho ashaka ko igicuruzwa kijya.'
                              : 'Individuals enter their Province, District, Sector, Cell & Village destination.'
                          }
                          onLocationChange={(_addr, coords) => setAdminMapBuyerPreview(coords)}
                        />
                      )}
                    </div>

                    {(activeMapOrder || activeMapProduct) && (
                      <DeliveryMap
                        lang={lang}
                        origin={
                          activeMapOrder?.originCoords ||
                          activeMapProduct?.originCoords ||
                          KIGALI_ZONES[3]
                        }
                        workshopName={
                          activeMapOrder?.workshopName ||
                          activeMapProduct?.workshopName ||
                          'JOKEVE FURNITURE'
                        }
                        buyerLocation={activeMapOrder?.buyerCoords || adminMapBuyerPreview}
                        onBuyerLocationChange={(loc) => {
                          if (activeMapOrder) {
                            adminUpdateOrder(activeMapOrder.id, { buyerCoords: loc })
                              .then((res) =>
                                setOrders((prev) =>
                                  prev.map((o) => (o.id === res.order.id ? res.order : o))
                                )
                              )
                              .catch(() => {});
                          } else {
                            setAdminMapBuyerPreview(loc);
                          }
                        }}
                        driverCoords={activeMapOrder?.driverCoords}
                        driverLabel={activeMapOrder?.driverLocationLabel}
                        driverUpdatedAt={activeMapOrder?.driverUpdatedAt}
                        products={products}
                        selectedProductId={activeMapProduct?.id}
                        onSelectProductId={(id) => setSelectedMapProductId(id)}
                        destinationLabel={
                          activeMapOrder
                            ? activeMapOrder.buyerName
                            : lang === 'rw'
                            ? 'Aho kijya'
                            : 'Destination'
                        }
                      />
                    )}
                  </div>

                  {/* Orders List */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Orders, Rentals & Courier Location Sharing ({orders.length})
                      </h2>
                    </div>
                    {orders.length === 0 ? (
                      <p className="p-6 text-xs text-slate-500">No orders or repair requests yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {orders.map((o) => (
                          <div
                            key={o.id}
                            className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                              activeMapOrder?.id === o.id ? 'bg-[#FAF9F6]' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <img
                                src={o.uploadedPhotoUrl || o.referenceImageUrl}
                                alt={o.productTitle}
                                className="w-16 h-12 rounded object-cover bg-slate-100 shrink-0"
                              />
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-mono font-semibold text-[#7C4D25]">{o.id}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className="capitalize text-slate-600">{o.orderType}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                                    {formatRwf(o.agreedPriceRwf)}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {o.productTitle}
                                </p>
                                <p className="text-xs text-slate-500">
                                  <span className="font-medium text-slate-700">
                                    {o.originCoords?.label || o.workshopName}
                                  </span>{' '}
                                  → {o.buyerName} ({o.buyerPhone}): {o.deliveryAddress}{' '}
                                  {o.distanceKm ? `(${o.distanceKm} km)` : ''} · {o.paymentMethod}:{' '}
                                  <span className="font-mono">{o.paymentRef}</span>
                                </p>
                                {o.driverLocationLabel && (
                                  <p className="text-xs text-amber-700 font-medium">
                                    Courier reached: {o.driverLocationLabel}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedMapOrderId(o.id)}
                                className="px-2.5 py-1.5 text-xs font-medium border border-[#7C4D25]/40 bg-[#FAF9F6] text-[#7C4D25] rounded hover:bg-[#F2EFE9] cursor-pointer"
                              >
                                {lang === 'rw' ? 'Reba kuri Map' : 'Focus on Map'}
                              </button>
                              <select
                                value={driverZoneIdx[o.id] ?? 0}
                                onChange={(e) =>
                                  setDriverZoneIdx((prev) => ({
                                    ...prev,
                                    [o.id]: Number(e.target.value),
                                  }))
                                }
                                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900"
                              >
                                {KIGALI_ZONES.map((z, idx) => (
                                  <option key={z.label} value={idx}>
                                    {z.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAdminShareDriverLoc(o.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#7C4D25] text-white rounded hover:bg-[#633D1D] cursor-pointer"
                              >
                                <LocateFixed className="w-3.5 h-3.5" />
                                <span>Set Courier Pin</span>
                              </button>

                              <select
                                value={o.status}
                                onChange={(e) =>
                                  handleOrderStatusChange(o.id, e.target.value as OrderStatus)
                                }
                                className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="in_craft">In Craft</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Users, Session Revocation & Granular Permissions Control */}
              {tab === 'users' && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        {lang === 'rw'
                          ? `Abiyandikishije, Gukura Login & Guha/Kwima Ububasha (${users.length})`
                          : `Registered Users, Session Kick & Permissions (${users.length})`}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'rw'
                          ? 'Shyira hasi abantu bashya, ubakure muri login ako kanya, ubime ububasha (Products, Ads, Uruganiriro, Orders) cyangwa usibe konti.'
                          : 'View new sign-ups live, force sign out active devices, restrict specific permissions, or permanently remove accounts.'}
                      </p>
                    </div>
                  </div>
                  {users.length === 0 ? (
                    <p className="p-6 text-xs text-slate-500">No buyers or sellers registered yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {users.map((u) => {
                        const perms = u.permissions || {
                          canPostProducts: true,
                          canPostAds: true,
                          canSendChat: true,
                          canPlaceOrders: true,
                        };
                        const permEntries: { key: keyof UserPermissions; label: string }[] = [
                          { key: 'canPostProducts', label: lang === 'rw' ? 'Gushyira Ibicuruzwa' : 'Post Products' },
                          { key: 'canPostAds', label: lang === 'rw' ? 'Kwamamaza (Ads)' : 'Post Ads' },
                          { key: 'canSendChat', label: lang === 'rw' ? 'Uruganiriro (Chat)' : 'Send Messages' },
                          { key: 'canPlaceOrders', label: lang === 'rw' ? 'Gukora Command' : 'Place Orders' },
                        ];
                        const confirmingDelete = confirmDeleteUserId === u.id;

                        return (
                          <div key={u.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/70">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="text-sm font-semibold text-slate-900">{u.name}</span>
                                  {u.workshopName && (
                                    <span className="text-slate-500">({u.workshopName})</span>
                                  )}
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize font-medium">
                                    {u.role}
                                  </span>
                                  <span
                                    className={`font-semibold capitalize ${
                                      u.status === 'active' ? 'text-emerald-700' : 'text-red-600'
                                    }`}
                                  >
                                    · {u.status}
                                  </span>
                                </div>
                                <p className="text-xs font-mono text-slate-600">
                                  {u.phone} · {u.email}
                                  {u.location ? ` · ${u.location}` : ''}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500">
                                  Joined: {formatShortDateTime(u.createdAt)} · Last Login:{' '}
                                  {formatShortDateTime(u.lastLoginAt || u.createdAt)}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleRevokeUserSession(u)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded hover:bg-amber-100 cursor-pointer whitespace-nowrap"
                                >
                                  <LogOut className="w-3.5 h-3.5" />
                                  <span>{lang === 'rw' ? 'Kuraho Login' : 'Force Sign Out'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserRole(u)}
                                  className="px-2.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                                >
                                  {u.role === 'seller' ? 'Set Buyer' : 'Set Seller'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 border rounded cursor-pointer whitespace-nowrap ${
                                    u.status === 'active'
                                      ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>{u.status === 'active' ? 'Suspend' : 'Activate'}</span>
                                </button>
                                {confirmingDelete ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u)}
                                      className="px-2.5 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer whitespace-nowrap"
                                    >
                                      {lang === 'rw' ? 'Emeza Gusiba' : 'Confirm Delete'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteUserId(null)}
                                      className="px-2 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                                    >
                                      {lang === 'rw' ? 'Oya' : 'Cancel'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUserId(u.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-600 border border-red-200 rounded hover:bg-red-50 cursor-pointer whitespace-nowrap"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{lang === 'rw' ? 'Siba' : 'Delete'}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Individual Capability / Permission Switches */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[11px] font-medium text-slate-500 mr-1">
                                {lang === 'rw' ? 'Ububasha (Permissions):' : 'Capabilities:'}
                              </span>
                              {permEntries.map((item) => {
                                const allowed = perms[item.key] !== false;
                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleTogglePermission(u, item.key)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                                      allowed
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                        : 'bg-red-50 border-red-200 text-red-700 line-through hover:bg-red-100'
                                    }`}
                                  >
                                    {allowed ? (
                                      <Check className="w-3 h-3 shrink-0" />
                                    ) : (
                                      <X className="w-3 h-3 shrink-0" />
                                    )}
                                    <span>{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Unified Uruganiriro View (Identical to storefront Uruganiriro) */}
              {tab === 'chats' && (
                <div className="bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl overflow-hidden">
                  <ChatInbox
                    lang={lang}
                    user={user}
                    onOpenAuth={() => {}}
                    onUserUpdated={onUserUpdated}
                  />
                </div>
              )}

              {/* Video & Animated Photo Advertisements Control (Admin-Only Copy & Media) */}
              {tab === 'ads' && (
                <div className="space-y-5">
                  {/* Admin Custom Advertisement Heading & Copy */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSavingBannerSettings(true);
                      setError('');
                      try {
                        const res = await adminUpdateSettings({
                          adBannerTitle: (settings.adBannerTitle || '').trim(),
                          adBannerText: (settings.adBannerText || '').trim(),
                        });
                        setSettings(res.settings);
                        onBannerChanged?.(
                          res.settings.adBannerTitle || '',
                          res.settings.adBannerText || ''
                        );
                        setNotice(
                          lang === 'rw'
                            ? 'Inyandiko ya Admin kuri Advertisement yabitswe.'
                            : 'Advertisement section text updated.'
                        );
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : 'Failed to save advertisement text.'
                        );
                      } finally {
                        setSavingBannerSettings(false);
                      }
                    }}
                    className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
                  >
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        {lang === 'rw'
                          ? 'Inyandiko ya Admin kuri Advertisement'
                          : 'Admin Custom Advertisement Text'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {lang === 'rw'
                          ? 'Administrator wenyine ni we wandika umutwe, ubutumwa, cyangwa agahindura inyandiko ziri ku byamamaza (harimo no gukodesha intebe n’ibindi).'
                          : 'Only Administrator writes the Advertisement banner heading, custom copy, and all ad card titles.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          {lang === 'rw'
                            ? 'Umutwe wa Advertisement (Siba ube empty niba ushaka "Advertisement")'
                            : 'Section Heading (optional)'}
                        </label>
                        <input
                          type="text"
                          value={settings.adBannerTitle || ''}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, adBannerTitle: e.target.value }))
                          }
                          placeholder="Advertisement"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          {lang === 'rw'
                            ? 'Ubutumwa / Inyandiko ya Admin kuri Advertisement'
                            : 'Custom Advertisement Note / Announcement'}
                        </label>
                        <input
                          type="text"
                          value={settings.adBannerText || ''}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, adBannerText: e.target.value }))
                          }
                          placeholder={
                            lang === 'rw'
                              ? 'Andika icyo ushaka cyose cyigaragara kuri Advertisement...'
                              : 'Write anything you want displayed on Advertisement...'
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingBannerSettings}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1C1917] rounded-md hover:bg-[#332E2A] cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 text-[#E5B748]" />
                        <span>
                          {savingBannerSettings
                            ? '...'
                            : lang === 'rw'
                            ? 'Bika Inyandiko'
                            : 'Save Ad Text'}
                        </span>
                      </button>
                    </div>
                  </form>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-5 py-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        {lang === 'rw'
                          ? `Ibyamamaza bya Video & Amafoto (${ads.length})`
                          : `Video & Animated Photo Advertisements (${ads.length})`}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {lang === 'rw'
                          ? 'Ongeraho ikimenyekanisha gishya, hindura amagambo yose cyangwa amafoto ahindagurika.'
                          : 'Add new video or animated photo ads, or edit all text, photos, and visibility.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAd(null);
                        setAdEditorOpen((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {adEditorOpen && !editingAd
                          ? lang === 'rw'
                            ? 'Funga Ifishi'
                            : 'Close Form'
                          : lang === 'rw'
                          ? 'Shyiraho Ikimenyekanisha'
                          : 'Add Advertisement'}
                      </span>
                    </button>
                  </div>

                  {adEditorOpen && (
                    <AdEditorForm
                      key={editingAd?.id || 'admin-new-ad'}
                      lang={lang}
                      products={products}
                      editingAd={editingAd}
                      isAdmin
                      defaultWorkshopName="JOKEVE FURNITURE HQ"
                      onCancel={() => {
                        setAdEditorOpen(false);
                        setEditingAd(null);
                      }}
                      onSaved={(saved, isNew) => {
                        const next = isNew
                          ? [saved, ...ads]
                          : ads.map((a) => (a.id === saved.id ? saved : a));
                        setAds(next);
                        onAdsChanged?.(next.filter((a) => a.status === 'active'));
                        setAdEditorOpen(false);
                        setEditingAd(null);
                        setNotice(
                          isNew
                            ? `Added advertisement "${saved.title}".`
                            : `Updated advertisement "${saved.title}".`
                        );
                      }}
                    />
                  )}

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    {ads.length === 0 ? (
                      <p className="p-6 text-xs text-slate-500">
                        No advertisements submitted yet. Click Add Advertisement above to create one.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {ads.map((ad) => (
                          <div
                            key={ad.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <img
                                src={ad.posterImageUrl}
                                alt={ad.title}
                                className="w-20 h-14 object-cover rounded bg-slate-100 shrink-0"
                              />
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-900 truncate">{ad.title}</p>
                                  <span
                                    className={`font-medium capitalize ${
                                      ad.status === 'active' ? 'text-emerald-700' : 'text-amber-700'
                                    }`}
                                  >
                                    · {ad.status}
                                  </span>
                                </div>
                                <p className="text-slate-600 line-clamp-1">{ad.caption}</p>
                                <p className="text-slate-500 font-mono tabular-nums">
                                  {ad.workshopName} · {ad.views} views ·{' '}
                                  {ad.videoUrl && ad.mediaType !== 'slideshow'
                                    ? 'Video'
                                    : `${ad.slideshowImages?.length || 1} animated photos`}
                                  {ad.displaySize === 'big' ? ' · Big Display' : ''}
                                  {ad.appUrl ? ` · App: ${ad.appName || ad.appUrl}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAd(ad);
                                  setAdEditorOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#7C4D25]" />
                                <span>{lang === 'rw' ? 'Hindura Byose' : 'Edit Text & Media'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAdStatus(ad)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                              >
                                {ad.status === 'active' ? (
                                  <>
                                    <Pause className="w-3.5 h-3.5" />
                                    <span>Pause</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteAd(ad)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 border border-red-200 rounded hover:bg-red-50 cursor-pointer whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Platform Settings */}
              {tab === 'settings' && (
                <form
                  onSubmit={handleSaveSettings}
                  className="max-w-xl bg-white border border-slate-200 rounded-lg p-6 space-y-4"
                >
                  <h2 className="text-sm font-semibold text-slate-900">Platform Settings</h2>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={settings.platformName}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, platformName: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Verified Administrator Email (Protected)
                    </label>
                    <input
                      type="email"
                      value={settings.adminEmail}
                      disabled
                      className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-md text-slate-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Default MoMo Pay Code
                      </label>
                      <input
                        type="text"
                        value={settings.defaultMomoCode}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, defaultMomoCode: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Support Phone
                      </label>
                      <input
                        type="text"
                        value={settings.supportPhone}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, supportPhone: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Default Bank Account
                    </label>
                    <input
                      type="text"
                      value={settings.defaultBankAccount}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, defaultBankAccount: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Settings</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {editingFullProduct && (
        <ProductEditorModal
          lang={lang}
          user={user}
          product={editingFullProduct}
          onClose={() => setEditingFullProduct(null)}
          onSaved={(updated) => {
            const next = products.map((item) => (item.id === updated.id ? updated : item));
            setProducts(next);
            onProductsChanged(next);
            setNotice(`Updated "${updated.title}".`);
          }}
        />
      )}
    </div>
  );
}
