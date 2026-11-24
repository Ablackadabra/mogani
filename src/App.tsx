import { useEffect, useState } from 'react';
import { Globe, Play } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { ActiveView, Header } from './components/Header';
import { Hero } from './components/Hero';
import { CatalogSection } from './components/CatalogSection';
import { ProductDetailModal } from './components/ProductDetailModal';
import { RepairStudio } from './components/RepairStudio';
import { SellStudio } from './components/SellStudio';
import { ChatInbox } from './components/ChatInbox';
import { AuthModal } from './components/AuthModal';
import { OrdersDrawer } from './components/OrdersDrawer';
import { DeliveryMap, KIGALI_ZONES } from './components/DeliveryMap';
import { AdminDashboard } from './components/AdminDashboard';
import { RwandaLocationPicker } from './components/RwandaLocationPicker';
import { IntroSplash } from './components/IntroSplash';
import { AdShowcaseSection } from './components/AdShowcaseSection';
import { ProductEditorModal } from './components/ProductEditorModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { TrendingSection } from './components/TrendingSection';
import { AdVideo, GeoLocation, Language, Order, Product, PublicUser } from './types';
import {
  ApiError,
  adminUpdateProduct,
  fetchAds,
  fetchCurrentUser,
  fetchOrders,
  fetchProducts,
  fetchWishlist,
  getAuthToken,
  openConversation,
  readStoredUser,
  removeWishlistItem,
  setAuthToken,
  syncWishlist,
  toggleProductLike,
  toggleWishlistItem,
  updateOrderOrigin,
  writeStoredUser,
} from './api';
import { getCopy, LANGUAGES } from './i18n';

const WISHLIST_STORAGE_KEY = 'jokeve_wishlist_v1';
const LANG_STORAGE_KEY = 'jokeve_lang_v1';

function readStoredLang(): Language {
  try {
    const val = localStorage.getItem(LANG_STORAGE_KEY);
    if (val && LANGUAGES.some((l) => l.code === val)) {
      return val as Language;
    }
  } catch {
    // ignore storage errors
  }
  return 'rw';
}

function readStoredWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredWishlist(ids: string[]) {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [lang, setLang] = useState<Language>(() => readStoredLang());
  const [activeView, setActiveView] = useState<ActiveView>('collection');
  const [user, setUser] = useState<PublicUser | null>(() => readStoredUser());

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [ads, setAds] = useState<AdVideo[]>([]);
  const [adBannerTitle, setAdBannerTitle] = useState('');
  const [adBannerText, setAdBannerText] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mapProductId, setMapProductId] = useState<string>('');
  const [trackedOrderId, setTrackedOrderId] = useState<string>('');
  const [buyerLocation, setBuyerLocation] = useState<GeoLocation>(KIGALI_ZONES[1]);
  const [adminOriginPreview, setAdminOriginPreview] = useState<GeoLocation | null>(null);
  const [mapNotice, setMapNotice] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => readStoredWishlist());
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [ordersDrawerOpen, setOrdersDrawerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  const t = getCopy(lang);
  const currentLangObj = LANGUAGES.find((l) => l.code === lang);

  useEffect(() => {
    document.documentElement.dir = currentLangObj?.dir || 'ltr';
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang, currentLangObj?.dir]);

  // Keep user signed in automatically on the same device across reloads/revisits,
  // and immediately sync permission updates or admin session revocation
  useEffect(() => {
    const syncSession = () => {
      if (!getAuthToken()) return;
      fetchCurrentUser()
        .then((res) => {
          if (res.token) {
            setAuthToken(res.token);
          }
          setUser(res.user);
          writeStoredUser(res.user);
        })
        .catch((err) => {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            setAuthToken(null);
            writeStoredUser(null);
            setUser(null);
          }
        });
    };

    syncSession();

    const handleRevoked = (ev: Event) => {
      const custom = ev as CustomEvent<{ message?: string }>;
      setAuthToken(null);
      writeStoredUser(null);
      setUser(null);
      setOrdersDrawerOpen(false);
      setActiveView((prev) => (prev === 'admin' ? 'collection' : prev));
      setAuthNotice(
        custom.detail?.message ||
          (lang === 'rw'
            ? 'Konti yawe yakuwe muri login cyangwa yahagaritswe na Administrator.'
            : 'Your session was signed out or restricted by the administrator.')
      );
    };

    window.addEventListener('jokeve:auth-revoked', handleRevoked);
    window.addEventListener('focus', syncSession);

    return () => {
      window.removeEventListener('jokeve:auth-revoked', handleRevoked);
      window.removeEventListener('focus', syncSession);
    };
  }, [lang]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      if (!getAuthToken()) return;
      fetchCurrentUser()
        .then((res) => {
          if (res.token) {
            setAuthToken(res.token);
          }
          setUser(res.user);
          writeStoredUser(res.user);
        })
        .catch((err) => {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            setAuthToken(null);
            writeStoredUser(null);
            setUser(null);
          }
        });
    }, 12000);
    return () => clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    fetchProducts(category, searchQuery)
      .then((res) => {
        if (!active) return;
        setProducts(res.products);
        if (category === 'all' && !searchQuery.trim()) {
          setAllProducts(res.products);
        }
        if (!mapProductId && res.products.length > 0) {
          setMapProductId(res.products[0].id);
        }
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [category, searchQuery]);

  useEffect(() => {
    let active = true;
    fetchProducts('all', '')
      .then((res) => {
        if (active) setAllProducts(res.products);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (deepLinkHandled) return;
    const pool = allProducts.length > 0 ? allProducts : products;
    if (pool.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const productParam = params.get('product');
    if (!productParam) {
      setDeepLinkHandled(true);
      return;
    }
    const matched = pool.find((item) => item.id === productParam);
    if (matched) {
      setSelectedProduct(matched);
      setShowIntro(false);
    }
    setDeepLinkHandled(true);
  }, [deepLinkHandled, allProducts, products]);

  useEffect(() => {
    let active = true;
    fetchAds()
      .then((res) => {
        if (!active) return;
        setAds(res.ads);
        setAdBannerTitle(res.adBannerTitle || '');
        setAdBannerText(res.adBannerText || '');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    fetchOrders()
      .then((res) => setOrders(res.orders))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const localIds = readStoredWishlist();
    const request = localIds.length > 0 ? syncWishlist(localIds) : fetchWishlist();
    request
      .then((res) => {
        if (!active) return;
        setWishlistIds(res.productIds);
        writeStoredWishlist(res.productIds);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Poll orders every 4s when viewing live map so courier location pins update automatically
  useEffect(() => {
    if (!user || activeView !== 'map') return;
    const timer = setInterval(() => {
      fetchOrders()
        .then((res) => setOrders(res.orders))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [user, activeView]);

  function handleNavigate(view: ActiveView, anchor?: string) {
    setActiveView(view);
    if (anchor) {
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleAuthSuccess(token: string, authedUser: PublicUser) {
    setAuthToken(token);
    writeStoredUser(authedUser);
    setUser(authedUser);
    setAuthNotice('');
    setAuthModalOpen(false);
    if (authedUser.role === 'admin') {
      setActiveView('admin');
    }
  }

  function handleUserUpdated(updated: PublicUser) {
    setUser(updated);
    writeStoredUser(updated);
  }

  function handleLogout() {
    setAuthToken(null);
    writeStoredUser(null);
    setUser(null);
    setOrdersDrawerOpen(false);
    setWishlistDrawerOpen(false);
    setShowWishlistOnly(false);
    setWishlistIds([]);
    writeStoredWishlist([]);
    if (activeView === 'admin') {
      setActiveView('collection');
    }
  }

  function refreshAllProductCounts() {
    fetchProducts(category, searchQuery)
      .then((res) => setProducts(res.products))
      .catch(() => {});
    fetchProducts('all', '')
      .then((res) => setAllProducts(res.products))
      .catch(() => {});
  }

  async function handleToggleProductLike(productId: string) {
    try {
      const res = await toggleProductLike(productId);
      setProducts((prev) => prev.map((item) => (item.id === productId ? res.product : item)));
      setAllProducts((prev) => prev.map((item) => (item.id === productId ? res.product : item)));
      setSelectedProduct((prev) => (prev?.id === productId ? res.product : prev));
    } catch {
      // ignore transient network errors
    }
  }

  function handleToggleWishlist(productId: string) {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [productId, ...prev];
      writeStoredWishlist(next);
      return next;
    });
    if (user) {
      toggleWishlistItem(productId)
        .then((res) => {
          setWishlistIds(res.productIds);
          writeStoredWishlist(res.productIds);
          refreshAllProductCounts();
        })
        .catch(() => {});
    }
  }

  function handleRemoveWishlist(productId: string) {
    setWishlistIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      writeStoredWishlist(next);
      return next;
    });
    if (user) {
      removeWishlistItem(productId)
        .then((res) => {
          setWishlistIds(res.productIds);
          writeStoredWishlist(res.productIds);
          refreshAllProductCounts();
        })
        .catch(() => {});
    }
  }

  function handleClearWishlist() {
    const previousIds = [...wishlistIds];
    setWishlistIds([]);
    writeStoredWishlist([]);
    setShowWishlistOnly(false);
    if (user && previousIds.length > 0) {
      Promise.all(previousIds.map((id) => removeWishlistItem(id).catch(() => null)))
        .then(() => refreshAllProductCounts())
        .catch(() => {});
    }
  }

  async function handleInquireFromWishlist(product: Product) {
    if (!user) {
      setWishlistDrawerOpen(false);
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await openConversation({
        productId: product.id,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        workshopName: product.workshopName,
        productTitle: product.title,
        productImageUrl: product.imageUrl,
      });
      setActiveConversationId(res.conversation.id);
      setWishlistDrawerOpen(false);
      handleNavigate('messages');
    } catch {
      setSelectedProduct(product);
    }
  }

  function handleOpenAddProduct() {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setEditingProduct(null);
    setEditorOpen(true);
  }

  function handleOpenEditProduct(product: Product) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setEditingProduct(product);
    setEditorOpen(true);
  }

  const canManageStore = Boolean(
    user &&
      (user.role === 'admin' ||
        (user.role === 'seller' && user.permissions?.canPostProducts !== false))
  );
  const catalogSource = allProducts.length > 0 ? allProducts : products;
  const displayedProducts = showWishlistOnly
    ? catalogSource.filter((p) => wishlistIds.includes(p.id))
    : products;

  const mapProduct = products.find((p) => p.id === mapProductId) || products[0];
  const trackedOrder =
    orders.find((o) => o.id === trackedOrderId) ||
    orders.find((o) => Boolean(o.driverCoords));

  function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function handleCloseSelectedProduct() {
    setSelectedProduct(null);
    const params = new URLSearchParams(window.location.search);
    if (params.has('product')) {
      params.delete('product');
      const nextSearch = params.toString();
      const nextUrl = nextSearch
        ? `${window.location.pathname}?${nextSearch}`
        : window.location.pathname;
      window.history.replaceState({}, '', nextUrl);
    }
  }

  return (
    <div
      onCopy={(e) => {
        if (activeView !== 'admin' && !isEditableTarget(e.target)) {
          e.preventDefault();
        }
      }}
      onCut={(e) => {
        if (activeView !== 'admin' && !isEditableTarget(e.target)) {
          e.preventDefault();
        }
      }}
      onContextMenu={(e) => {
        if (activeView !== 'admin' && !isEditableTarget(e.target)) {
          e.preventDefault();
        }
      }}
      className={`min-h-screen flex flex-col bg-[#FAF9F6] text-[#1C1917] ${
        activeView !== 'admin'
          ? 'select-none [&_input]:select-text [&_textarea]:select-text [&_select]:select-text'
          : ''
      }`}
    >
      <AnimatePresence>
        {showIntro && (
          <IntroSplash
            lang={lang}
            user={user}
            onChangeLang={setLang}
            onComplete={() => setShowIntro(false)}
          />
        )}
      </AnimatePresence>

      <Header
        lang={lang}
        activeView={activeView}
        user={user}
        wishlistCount={wishlistIds.length}
        onNavigate={handleNavigate}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenOrders={() => setOrdersDrawerOpen(true)}
        onOpenWishlist={() => setWishlistDrawerOpen(true)}
      />

      {authNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-4">
          <span>{authNotice}</span>
          <button
            type="button"
            onClick={() => setAuthNotice('')}
            className="font-medium underline cursor-pointer shrink-0"
          >
            {lang === 'rw' ? 'Funga' : 'Dismiss'}
          </button>
        </div>
      )}

      <main className="flex-1">
        {activeView === 'collection' && (
          <>
            <Hero
              lang={lang}
              user={user}
              onChangeLang={setLang}
              onBrowseCatalog={() => handleNavigate('collection', 'catalog-section')}
              onOpenRentals={() => {
                setShowWishlistOnly(false);
                setCategory('rentals');
                handleNavigate('collection', 'catalog-section');
              }}
              onOpenSell={() => handleNavigate('sell')}
              onOpenRepair={() => handleNavigate('repair')}
              onOpenMessages={() => handleNavigate('messages')}
              onOpenOrders={() => setOrdersDrawerOpen(true)}
              onOpenAdmin={() => handleNavigate('admin')}
              onLogout={handleLogout}
              onOpenAuthModal={() => setAuthModalOpen(true)}
              onAuthSuccess={handleAuthSuccess}
            />
            <TrendingSection
              lang={lang}
              products={catalogSource}
              wishlistIds={wishlistIds}
              mode="preview"
              onSelectProduct={(p) => setSelectedProduct(p)}
              onToggleLike={handleToggleProductLike}
              onToggleWishlist={handleToggleWishlist}
              onOpenFullTrendingPage={() => handleNavigate('trending')}
            />
            <AdShowcaseSection
              lang={lang}
              ads={ads}
              products={products}
              user={user}
              adBannerTitle={adBannerTitle}
              adBannerText={adBannerText}
              onBannerUpdated={(title, text) => {
                setAdBannerTitle(title);
                setAdBannerText(text);
              }}
              onOpenAuth={() => setAuthModalOpen(true)}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onAdCreated={(ad) => setAds((prev) => [ad, ...prev])}
              onAdUpdated={(updated) =>
                setAds((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
              }
              onAdDeleted={(id) => setAds((prev) => prev.filter((item) => item.id !== id))}
              onAdViewed={(id, views) =>
                setAds((prev) => prev.map((item) => (item.id === id ? { ...item, views } : item)))
              }
            />
            <CatalogSection
              lang={lang}
              products={displayedProducts}
              loading={loadingProducts}
              category={category}
              searchQuery={searchQuery}
              wishlistIds={wishlistIds}
              showWishlistOnly={showWishlistOnly}
              onToggleWishlistOnly={() => setShowWishlistOnly((prev) => !prev)}
              onToggleWishlist={handleToggleWishlist}
              onToggleLike={handleToggleProductLike}
              onCategoryChange={(cat) => {
                setShowWishlistOnly(false);
                setCategory(cat);
              }}
              onSearchChange={setSearchQuery}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onAddProduct={canManageStore ? handleOpenAddProduct : undefined}
              onEditProduct={canManageStore ? handleOpenEditProduct : undefined}
            />
          </>
        )}

        {activeView === 'trending' && (
          <TrendingSection
            lang={lang}
            products={catalogSource}
            wishlistIds={wishlistIds}
            mode="page"
            onSelectProduct={(p) => setSelectedProduct(p)}
            onToggleLike={handleToggleProductLike}
            onToggleWishlist={handleToggleWishlist}
            onBrowseCatalog={() => handleNavigate('collection', 'catalog-section')}
          />
        )}

        {activeView === 'repair' && (
          <RepairStudio
            lang={lang}
            products={products}
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOrderCreated={(order) => setOrders((prev) => [order, ...prev])}
            onConversationOpened={(convId) => {
              setActiveConversationId(convId);
              setActiveView('messages');
            }}
          />
        )}

        {activeView === 'map' && (
          <section className="max-w-7xl mx-auto px-6 py-12 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-[#E7E5E4]">
              <div className="space-y-1.5">
                <h1 className="font-display text-3xl font-medium text-[#1C1917]">
                  {t.mapTitle}
                </h1>
                <p className="text-sm sm:text-base text-[#57534E]">{t.mapSubtitle}</p>
              </div>
              {orders.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#57534E]">
                    {lang === 'rw' ? 'Kurikirana Command:' : 'Track Order:'}
                  </span>
                  <select
                    value={trackedOrder?.id || ''}
                    onChange={(e) => {
                      setTrackedOrderId(e.target.value);
                      setAdminOriginPreview(null);
                    }}
                    className="px-3 py-1.5 bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} · {o.productTitle}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {mapNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between gap-3">
                <span>{mapNotice}</span>
                <button
                  type="button"
                  onClick={() => setMapNotice('')}
                  className="font-medium underline cursor-pointer shrink-0"
                >
                  {lang === 'rw' ? 'Funga' : 'Dismiss'}
                </button>
              </div>
            )}

            <div className={`grid grid-cols-1 ${user?.role === 'admin' ? 'lg:grid-cols-2' : ''} gap-4`}>
              <RwandaLocationPicker
                lang={lang}
                title={
                  lang === 'rw'
                    ? 'Aho Umuntu Ku Giti Cye Ashaka ko Igicuruzwa Kijya'
                    : 'Individual Destination (Province · District · Sector · Cell · Village · Details)'
                }
                subtitle={
                  lang === 'rw'
                    ? 'Andika Intara, Akarere, Umurenge, Akagari, Umudugudu n’ibindi bisobanuro aho uherereye.'
                    : 'Type your Province, District, Sector, Cell, Village, and delivery details anywhere in Rwanda.'
                }
                onLocationChange={(_addr, coords) => setBuyerLocation(coords)}
              />

              {user?.role === 'admin' && (
                <RwandaLocationPicker
                  lang={lang}
                  title={
                    lang === 'rw'
                      ? 'Aho Igicuruzwa Kirimo Kuva (Administrator Origin)'
                      : 'Dispatch Origin — Where Item Ships From (Admin)'
                  }
                  subtitle={
                    lang === 'rw'
                      ? 'Shyiramo aho igicuruzwa kirimo kuva mu Rwanda hose, uhite ubibona kuri Map ako kanya.'
                      : 'Enter where the product ships from anywhere in Rwanda to plot & save it live on the map.'
                  }
                  actionButtonLabel={
                    lang === 'rw' ? 'Emeza & Reba kuri Map' : 'Save Origin & Plot on Map'
                  }
                  onLocationChange={(_addr, coords) => setAdminOriginPreview(coords)}
                  onActionSubmit={async (addr, coords) => {
                    setAdminOriginPreview(coords);
                    setMapNotice('');
                    try {
                      if (trackedOrder) {
                        const res = await updateOrderOrigin(trackedOrder.id, {
                          lat: coords.lat,
                          lng: coords.lng,
                          label: addr,
                        });
                        setOrders((prev) =>
                          prev.map((o) => (o.id === res.order.id ? res.order : o))
                        );
                      }
                      if (mapProduct) {
                        const prodRes = await adminUpdateProduct(mapProduct.id, {
                          location: addr,
                          originCoords: { lat: coords.lat, lng: coords.lng, label: addr },
                        });
                        setProducts((prev) =>
                          prev.map((p) => (p.id === prodRes.product.id ? prodRes.product : p))
                        );
                        setAllProducts((prev) =>
                          prev.map((p) => (p.id === prodRes.product.id ? prodRes.product : p))
                        );
                      }
                      setMapNotice(
                        lang === 'rw'
                          ? `Aho igicuruzwa kirimo kuva habonywe kuri Map: ${addr}`
                          : `Dispatch origin saved and plotted live: ${addr}`
                      );
                    } catch {
                      setMapNotice(
                        lang === 'rw'
                          ? `Icyerekezo kigaragajwe kuri Map: ${addr}`
                          : `Origin preview plotted on map: ${addr}`
                      );
                    }
                  }}
                />
              )}
            </div>

            {mapProduct ? (
              <DeliveryMap
                lang={lang}
                origin={
                  adminOriginPreview ||
                  trackedOrder?.originCoords ||
                  mapProduct.originCoords ||
                  KIGALI_ZONES[3]
                }
                workshopName={
                  adminOriginPreview?.label || trackedOrder?.workshopName || mapProduct.workshopName
                }
                buyerLocation={trackedOrder?.buyerCoords || buyerLocation}
                onBuyerLocationChange={setBuyerLocation}
                driverCoords={trackedOrder?.driverCoords}
                driverLabel={trackedOrder?.driverLocationLabel}
                driverUpdatedAt={trackedOrder?.driverUpdatedAt}
                products={products}
                selectedProductId={mapProduct.id}
                onSelectProductId={(id) => {
                  setMapProductId(id);
                  setAdminOriginPreview(null);
                }}
              />
            ) : (
              <div className="p-8 bg-white border border-[#E7E5E4] rounded-lg text-sm text-[#57534E]">
                Loading workshops and map coordinates...
              </div>
            )}
          </section>
        )}

        {activeView === 'messages' && (
          <ChatInbox
            lang={lang}
            user={user}
            initialConversationId={activeConversationId}
            onOpenAuth={() => setAuthModalOpen(true)}
            onUserUpdated={handleUserUpdated}
          />
        )}

        {activeView === 'sell' && (
          <SellStudio
            lang={lang}
            user={user}
            products={products}
            orders={orders}
            onOpenAuth={() => setAuthModalOpen(true)}
            onProductCreated={(product) => {
              setProducts((prev) => [product, ...prev]);
              setAllProducts((prev) => [product, ...prev]);
            }}
            onProductDeleted={(id) => {
              setProducts((prev) => prev.filter((item) => item.id !== id));
              setAllProducts((prev) => prev.filter((item) => item.id !== id));
            }}
            onOrderUpdated={(updated) =>
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
            }
            onEditProduct={handleOpenEditProduct}
          />
        )}

        {activeView === 'admin' && user?.role === 'admin' && (
          <AdminDashboard
            lang={lang}
            user={user}
            onExitToStorefront={() => handleNavigate('collection')}
            onProductsChanged={(updatedList) => {
              setProducts(updatedList);
              setAllProducts(updatedList);
            }}
            onAdsChanged={setAds}
            onBannerChanged={(title, text) => {
              setAdBannerTitle(title);
              setAdBannerText(text);
            }}
            onUserUpdated={handleUserUpdated}
          />
        )}
      </main>

      {activeView !== 'admin' && (
        <footer className="border-t border-[#E7E5E4] bg-white">
          <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-[#57534E]">
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold text-[#1C1917]">
                {t.brand} · Kigali, Rwanda
              </p>
              <p className="text-[11px] text-[#78716C]">
                {lang === 'rw'
                  ? 'Kugurisha, Gukora mu Giti, Gukodesha Intebe & Gusana'
                  : 'Custom Carpentry, Chair Rentals & Restoration'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5 font-medium">
              <button
                type="button"
                onClick={() => handleNavigate('trending')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                {lang === 'rw' ? 'Bikunzwe Cyane' : 'Most Loved'}
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('collection', 'catalog-section')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                {t.navCollection}
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('repair')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                {t.navRepair}
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('map')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                {t.navMap}
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('messages')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                {t.navMessages}
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('sell')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                {t.navSell}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIntro(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1C1917] border border-[#D6D3D1] rounded-md hover:bg-[#FAF9F6] cursor-pointer"
              >
                <Play className="w-3 h-3 text-[#7C4D25]" />
                <span>{lang === 'rw' ? 'Reba Intro' : 'Replay Intro'}</span>
              </button>
              <label className="inline-flex items-center gap-1.5 text-xs text-[#1C1917] border border-[#D6D3D1] rounded-md px-2.5 py-1.5">
                <Globe className="w-3.5 h-3.5 text-[#7C4D25]" />
                <select
                  aria-label="Footer language selector"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="bg-transparent text-xs cursor-pointer focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </footer>
      )}

      {selectedProduct && (
        <ProductDetailModal
          lang={lang}
          product={selectedProduct}
          user={user}
          buyerLocation={buyerLocation}
          onBuyerLocationChange={setBuyerLocation}
          onClose={handleCloseSelectedProduct}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOrderCreated={(order) => {
            setOrders((prev) => [order, ...prev]);
            refreshAllProductCounts();
          }}
          onEditProduct={canManageStore ? (p) => handleOpenEditProduct(p) : undefined}
          isWishlisted={wishlistIds.includes(selectedProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onToggleLike={handleToggleProductLike}
        />
      )}

      {editorOpen && user && (
        <ProductEditorModal
          lang={lang}
          user={user}
          product={editingProduct}
          onClose={() => {
            setEditorOpen(false);
            setEditingProduct(null);
          }}
          onSaved={(saved, isNew) => {
            if (isNew) {
              setProducts((prev) => [saved, ...prev]);
              setAllProducts((prev) => [saved, ...prev]);
            } else {
              setProducts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
              setAllProducts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
              if (selectedProduct?.id === saved.id) {
                setSelectedProduct(saved);
              }
            }
          }}
        />
      )}

      {authModalOpen && (
        <AuthModal
          lang={lang}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {wishlistDrawerOpen && (
        <WishlistDrawer
          lang={lang}
          user={user}
          products={catalogSource}
          wishlistIds={wishlistIds}
          onClose={() => setWishlistDrawerOpen(false)}
          onRemove={handleRemoveWishlist}
          onClearAll={handleClearWishlist}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onInquireProduct={handleInquireFromWishlist}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      )}

      {ordersDrawerOpen && user && (
        <OrdersDrawer
          lang={lang}
          user={user}
          orders={orders}
          onClose={() => setOrdersDrawerOpen(false)}
          onLogout={handleLogout}
          onTrackOnMap={(order) => {
            setTrackedOrderId(order.id);
            setOrdersDrawerOpen(false);
            handleNavigate('map');
          }}
        />
      )}
    </div>
  );
}
