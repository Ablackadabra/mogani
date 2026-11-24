import { useState } from 'react';
import { Upload, Trash2, CheckCircle2, Plus, LocateFixed, Navigation, Pencil } from 'lucide-react';
import {
  Language,
  ListingMode,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  PublicUser,
} from '../types';
import { getCopy } from '../i18n';
import { compressImageFile, formatRwf } from '../utils/image';
import {
  createProduct,
  deleteProduct,
  shareOrderDriverLocation,
  updateOrderStatus,
} from '../api';
import { KIGALI_ZONES } from './DeliveryMap';

interface SellStudioProps {
  lang: Language;
  user: PublicUser | null;
  products: Product[];
  orders: Order[];
  onOpenAuth: () => void;
  onProductCreated: (product: Product) => void;
  onProductDeleted: (id: string) => void;
  onOrderUpdated: (order: Order) => void;
  onEditProduct?: (product: Product) => void;
}

const STUDIO_SAMPLE_IMAGES = [
  '/src/assets/images/wardrobe_cabinet_walnut_1795441272016.jpg',
  '/src/assets/images/bed_frame_hardwood_1795441272228.jpg',
  '/src/assets/images/rental_event_chairs_1795441271646.jpg',
  '/src/assets/images/chair_velvet_emerald_1795425663793.jpg',
  '/src/assets/images/sofa_boucle_nordic_1795425663358.jpg',
  '/src/assets/images/dining_set_walnut_1795425663356.jpg',
];

export function SellStudio({
  lang,
  user,
  products,
  orders,
  onOpenAuth,
  onProductCreated,
  onProductDeleted,
  onOrderUpdated,
  onEditProduct,
}: SellStudioProps) {
  const t = getCopy(lang);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('wardrobes');
  const [listingMode, setListingMode] = useState<ListingMode>('sale');
  const [priceRwf, setPriceRwf] = useState('220000');
  const [rentalPricePerDayRwf, setRentalPricePerDayRwf] = useState('1500');
  const [material, setMaterial] = useState('Solid Walnut & Hardwood');
  const [dimensions, setDimensions] = useState('180 × 60 × 210 cm');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(STUDIO_SAMPLE_IMAGES[0]);
  const [momoCode, setMomoCode] = useState(user?.momoCode || '*182*8*1*#');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '');
  const [location, setLocation] = useState(user?.location || 'Kigali');

  const [checkpointZone, setCheckpointZone] = useState<Record<string, number>>({});
  const [sharingOrderId, setSharingOrderId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!user) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-5">
        <h1 className="font-display text-3xl font-medium text-[#1C1917]">{t.sellTitle}</h1>
        <p className="text-base text-[#57534E]">{t.sellSubtitle}</p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-3 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer"
        >
          {t.signIn}
        </button>
      </section>
    );
  }

  const myProducts = products.filter((p) => p.sellerId === user.id);
  const incomingOrders = orders.filter((o) => o.sellerId === user.id);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressImageFile(file);
      setImageUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process photo.');
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccessMsg('');
    setBusy(true);
    try {
      const res = await createProduct({
        title,
        titleRw: title,
        category,
        listingMode,
        priceRwf: Number(priceRwf),
        rentalPricePerDayRwf:
          listingMode === 'rent' || listingMode === 'both'
            ? Number(rentalPricePerDayRwf) || 1500
            : undefined,
        material,
        dimensions,
        leadTimeDays: Number(leadTimeDays) || 7,
        description: description || title,
        imageUrl,
        momoCode,
        phone: phone || user.phone,
        bankAccount,
        location,
      });
      onProductCreated(res.product);
      setTitle('');
      setDescription('');
      setSuccessMsg(
        lang === 'rw'
          ? 'Igicuruzwa cyawe cyagiye ku rubuga!'
          : 'Your furniture listing is now live in the catalog.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish listing.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProduct(id);
      onProductDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleAdvanceStatus(orderId: string, status: OrderStatus) {
    try {
      const res = await updateOrderStatus(orderId, status);
      onOrderUpdated(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order.');
    }
  }

  async function handleShareZoneLocation(orderId: string) {
    const zoneIdx = checkpointZone[orderId] ?? 0;
    const zone = KIGALI_ZONES[zoneIdx] || KIGALI_ZONES[0];
    setSharingOrderId(orderId);
    setError('');
    try {
      const res = await shareOrderDriverLocation(orderId, {
        lat: zone.lat,
        lng: zone.lng,
        label: zone.label,
      });
      onOrderUpdated(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share location.');
    } finally {
      setSharingOrderId(null);
    }
  }

  function handleShareLiveGps(orderId: string) {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in your browser.');
      return;
    }
    setSharingOrderId(orderId);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await shareOrderDriverLocation(orderId, {
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
            label: `Live Courier GPS (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
          });
          onOrderUpdated(res.order);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update courier GPS.');
        } finally {
          setSharingOrderId(null);
        }
      },
      () => {
        setSharingOrderId(null);
        setError('Could not read device GPS; select a neighborhood checkpoint instead.');
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }

  const canPostProducts = user.role === 'admin' || user.permissions?.canPostProducts !== false;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="space-y-2 pb-6 border-b border-[#E7E5E4]">
        <h1 className="font-display text-3xl font-medium text-[#1C1917]">{t.sellTitle}</h1>
        <p className="text-base text-[#57534E] max-w-2xl">{t.sellSubtitle}</p>
        {!canPostProducts && (
          <div className="mt-3 p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
            {lang === 'rw'
              ? 'Uburenganzira bwawe bwo gushyira cyangwa guhindura ibicuruzwa bwahagaritswe na Administrator.'
              : 'Your permission to publish or edit listings has been restricted by the administrator.'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Publish New Furniture Listing */}
        <form
          onSubmit={handlePublish}
          className="lg:col-span-6 p-6 bg-white border border-[#E7E5E4] rounded-lg space-y-4"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-[#F2EFE9]">
            <Plus className="w-4 h-4 text-[#7C4D25]" />
            <h2 className="text-base font-semibold text-[#1C1917]">
              {lang === 'rw'
                ? 'Shyiraho Intebe, Garde-robe, Utubati cyangwa Ibitanda'
                : 'New Furniture or Rental Listing'}
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">
              {lang === 'rw' ? 'Izina ry’igicuruzwa' : 'Listing Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Solid Mahogany Wardrobe / Event Plastic Chairs"
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Icyiciro' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              >
                <option value="wardrobes">{t.catWardrobes}</option>
                <option value="beds">{t.catBeds}</option>
                <option value="sofas">{t.catSofas}</option>
                <option value="dining">{t.catDining}</option>
                <option value="accent">{t.catAccent}</option>
                <option value="office">{t.catOffice}</option>
                <option value="rentals">{t.catRentals}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Uburyo bwo Gucuruza' : 'Listing Mode'}
              </label>
              <select
                value={listingMode}
                onChange={(e) => setListingMode(e.target.value as ListingMode)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              >
                <option value="sale">{lang === 'rw' ? 'Kugurisha Gusa (Sale)' : 'Sale Only'}</option>
                <option value="rent">{lang === 'rw' ? 'Gukodesha Gusa (Rent)' : 'Rent Daily Only'}</option>
                <option value="both">{lang === 'rw' ? 'Kugurisha & Gukodesha' : 'Both Sale & Rent'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Igiciro cyo Kugura (RWF)' : 'Sale Price (RWF)'}
              </label>
              <input
                type="number"
                min={500}
                step={500}
                value={priceRwf}
                onChange={(e) => setPriceRwf(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>

            {(listingMode === 'rent' || listingMode === 'both') && (
              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">
                  {lang === 'rw' ? 'Gukodesha ku Munsi (RWF/day)' : 'Daily Rental Rate (RWF)'}
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={rentalPricePerDayRwf}
                  onChange={(e) => setRentalPricePerDayRwf(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.fabricLabel}</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.dimensionsLabel}</label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Iminsi yo gukora' : 'Lead Days'}
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
          </div>

          {/* Photo Selection or Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#44403C]">
                {lang === 'rw' ? 'Ifoto y’igicuruzwa' : 'Product Photo'}
              </span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F2EFE9] border border-[#D6D3D1] rounded cursor-pointer hover:bg-[#E7E3DA]">
                <Upload className="w-3.5 h-3.5 text-[#7C4D25]" />
                <span>{lang === 'rw' ? 'Shyiramo Ifoto' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {STUDIO_SAMPLE_IMAGES.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImageUrl(src)}
                  className={`aspect-[4/3] rounded overflow-hidden border cursor-pointer ${
                    imageUrl === src ? 'border-[#7C4D25] ring-2 ring-[#7C4D25]/30' : 'border-[#E7E5E4]'
                  }`}
                >
                  <img src={src} alt="Preset item" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.payMomoCode}</label>
              <input
                type="text"
                value={momoCode}
                onChange={(e) => setMomoCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.payPhone}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.payBank}</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="BK · ..."
                className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">
              {lang === 'rw' ? 'Aho ukorera (Location)' : 'Workshop Location'}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">{t.notesLabel}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
            />
          </div>

          {error && (
            <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-2 rounded-md flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 px-5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {busy ? '...' : t.publishListingBtn}
          </button>
        </form>

        {/* Right: My Listings & Incoming Orders with Live Courier Location Sharing */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#1C1917]">
              {lang === 'rw' ? 'Ibicuruzwa Byanjye' : 'My Published Listings'} ({myProducts.length})
            </h2>
            {myProducts.length === 0 ? (
              <p className="text-sm text-[#57534E] p-5 bg-white border border-[#E7E5E4] rounded-lg">
                {lang === 'rw'
                  ? 'Nta gicuruzwa urashyira ku rubuga.'
                  : 'You have not published any furniture listings yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {myProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-4 p-3.5 bg-white border border-[#E7E5E4] rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-16 h-12 object-cover rounded shrink-0 bg-[#F2EFE9]"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1C1917] truncate">{p.title}</p>
                        <p className="text-xs font-mono text-[#57534E] tabular-nums">
                          {formatRwf(p.priceRwf)}
                          {p.rentalPricePerDayRwf ? ` · ${formatRwf(p.rentalPricePerDayRwf)}/d` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={() => onEditProduct(p)}
                          aria-label="Edit listing"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded hover:bg-[#E7E3DA] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#7C4D25]" />
                          <span>{lang === 'rw' ? 'Hindura' : 'Edit'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        aria-label="Remove listing"
                        className="p-2 text-[#78716C] hover:text-[#B91C1C] cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#1C1917]">
              {t.incomingOrdersTitle} ({incomingOrders.length})
            </h2>
            {incomingOrders.length === 0 ? (
              <p className="text-sm text-[#57534E] p-5 bg-white border border-[#E7E5E4] rounded-lg">
                {lang === 'rw'
                  ? 'Nta command cyangwa ubusabe bwo gusana urabona.'
                  : 'No incoming customer orders or repair requests yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {incomingOrders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 bg-white border border-[#E7E5E4] rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#7C4D25]">{o.id}</span>
                      <span className="text-xs font-medium text-[#1C1917] capitalize">
                        {o.orderType} · {o.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#1C1917]">{o.productTitle}</p>
                    <p className="text-xs text-[#57534E]">
                      {o.buyerName} · {o.buyerPhone} · {o.deliveryAddress}
                    </p>

                    {/* Live Courier Location Sharing Controls */}
                    <div className="p-3 rounded-md bg-[#FAF9F6] border border-[#E7E5E4] space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[#1C1917] flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-[#B45309]" />
                          {lang === 'rw' ? 'Sangiza Aho Ugeze:' : 'Courier Live Checkpoint:'}
                        </span>
                        {o.driverLocationLabel && (
                          <span className="text-[#B45309] font-medium truncate">
                            {o.driverLocationLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={checkpointZone[o.id] ?? 0}
                          onChange={(e) =>
                            setCheckpointZone((prev) => ({
                              ...prev,
                              [o.id]: Number(e.target.value),
                            }))
                          }
                          className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs bg-white border border-[#D6D3D1] rounded text-[#1C1917]"
                        >
                          {KIGALI_ZONES.map((z, idx) => (
                            <option key={z.label} value={idx}>
                              {z.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={sharingOrderId === o.id}
                          onClick={() => handleShareZoneLocation(o.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#7C4D25] rounded hover:bg-[#633D1D] disabled:opacity-50 cursor-pointer"
                        >
                          {lang === 'rw' ? 'Sangiza Checkpoint' : 'Share Point'}
                        </button>
                        <button
                          type="button"
                          disabled={sharingOrderId === o.id}
                          onClick={() => handleShareLiveGps(o.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1C1917] bg-white border border-[#D6D3D1] rounded hover:bg-[#F2EFE9] disabled:opacity-50 cursor-pointer"
                        >
                          <LocateFixed className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>GPS</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F2EFE9]">
                      <span className="font-mono text-xs font-semibold tabular-nums">
                        {formatRwf(o.agreedPriceRwf)} ({o.paymentRef})
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(['confirmed', 'in_craft', 'delivered'] as OrderStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleAdvanceStatus(o.id, st)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                              o.status === st
                                ? 'bg-[#1C1917] text-white border-[#1C1917]'
                                : 'bg-[#FAF9F6] text-[#57534E] border-[#D6D3D1] hover:text-[#1C1917]'
                            }`}
                          >
                            {st.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
