import { useState } from 'react';
import { CheckCircle2, ImagePlus, Plus, Save, X } from 'lucide-react';
import {
  Language,
  ListingMode,
  Product,
  ProductCategory,
  PublicUser,
} from '../types';
import { createProduct, updateProduct } from '../api';
import { compressImageFile } from '../utils/image';
import { getCopy } from '../i18n';

interface ProductEditorModalProps {
  lang: Language;
  user: PublicUser;
  product?: Product | null;
  onClose: () => void;
  onSaved: (product: Product, isNew: boolean) => void;
}

const STUDIO_IMAGES = [
  '/src/assets/images/sofa_boucle_nordic_1795425663358.jpg',
  '/src/assets/images/dining_set_walnut_1795425663356.jpg',
  '/src/assets/images/chair_velvet_emerald_1795425663793.jpg',
  '/src/assets/images/chair_executive_leather_1795425662984.jpg',
  '/src/assets/images/wardrobe_cabinet_walnut_1795441272016.jpg',
  '/src/assets/images/bed_frame_hardwood_1795441272228.jpg',
  '/src/assets/images/rental_event_chairs_1795441271646.jpg',
];

export function ProductEditorModal({
  lang,
  user,
  product,
  onClose,
  onSaved,
}: ProductEditorModalProps) {
  const t = getCopy(lang);
  const isEditing = Boolean(product);

  const [title, setTitle] = useState(product?.title || '');
  const [titleRw, setTitleRw] = useState(product?.titleRw || product?.title || '');
  const [category, setCategory] = useState<ProductCategory>(product?.category || 'sofas');
  const [listingMode, setListingMode] = useState<ListingMode>(product?.listingMode || 'sale');
  const [priceRwf, setPriceRwf] = useState(String(product?.priceRwf || 250000));
  const [rentalPricePerDayRwf, setRentalPricePerDayRwf] = useState(
    String(product?.rentalPricePerDayRwf || 1500)
  );
  const [material, setMaterial] = useState(product?.material || 'Solid Hardwood & Velvet');
  const [dimensions, setDimensions] = useState(product?.dimensions || '200 × 90 × 85 cm');
  const [leadTimeDays, setLeadTimeDays] = useState(String(product?.leadTimeDays || 7));
  const [location, setLocation] = useState(product?.location || user.location || 'Kigali, Rwanda');
  const [momoCode, setMomoCode] = useState(product?.momoCode || user.momoCode || '*182*8*1*448120#');
  const [phone, setPhone] = useState(product?.phone || user.phone || '0788001122');
  const [bankAccount, setBankAccount] = useState(
    product?.bankAccount || user.bankAccount || 'Bank of Kigali · 00040-0682411-94'
  );
  const [description, setDescription] = useState(product?.description || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || STUDIO_IMAGES[0]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError(lang === 'rw' ? 'Andika izina ry’igikoresho (nibura inyuguti 3).' : 'Title must be at least 3 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (isEditing && product) {
        const res = await updateProduct(product.id, {
          title: title.trim(),
          titleRw: (titleRw.trim() || title.trim()),
          category,
          listingMode,
          priceRwf: Number(priceRwf) || product.priceRwf,
          rentalPricePerDayRwf:
            listingMode === 'rent' || listingMode === 'both'
              ? Number(rentalPricePerDayRwf) || 1500
              : null,
          material: material.trim(),
          dimensions: dimensions.trim(),
          leadTimeDays: Number(leadTimeDays) || 7,
          description: description.trim() || title.trim(),
          descriptionRw: description.trim() || title.trim(),
          imageUrl,
          momoCode: momoCode.trim(),
          phone: phone.trim(),
          bankAccount: bankAccount.trim(),
          location: location.trim(),
        });
        onSaved(res.product, false);
      } else {
        const res = await createProduct({
          title: title.trim(),
          titleRw: titleRw.trim() || title.trim(),
          category,
          listingMode,
          priceRwf: Number(priceRwf) || 150000,
          rentalPricePerDayRwf:
            listingMode === 'rent' || listingMode === 'both'
              ? Number(rentalPricePerDayRwf) || 1500
              : undefined,
          material: material.trim(),
          dimensions: dimensions.trim(),
          leadTimeDays: Number(leadTimeDays) || 7,
          description: description.trim() || title.trim(),
          imageUrl,
          momoCode: momoCode.trim(),
          phone: phone.trim(),
          bankAccount: bankAccount.trim(),
          location: location.trim(),
        });
        onSaved(res.product, true);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product changes.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] overflow-y-auto p-4 sm:p-6 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl shadow-2xl overflow-hidden my-6">
        <div className="px-6 py-4 bg-white border-b border-[#E7E5E4] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {isEditing ? (
              <Save className="w-4 h-4 text-[#7C4D25]" />
            ) : (
              <Plus className="w-4 h-4 text-[#7C4D25]" />
            )}
            <div>
              <h2 className="font-display text-lg font-medium text-[#1C1917]">
                {isEditing
                  ? lang === 'rw'
                    ? 'Hindura Amakuru y’Igicuruzwa (Edit Item)'
                    : 'Edit Furniture / Rental Listing'
                  : lang === 'rw'
                  ? 'Ongeraho Igikoresho Gishya ku Rubuga'
                  : 'Add New Furniture or Rental Item'}
              </h2>
              <p className="text-xs text-[#57534E]">
                {lang === 'rw'
                  ? 'Hindura ifoto, izina, ibiciro, igiti cyangwa uburyo bwo kwishyura.'
                  : 'Update imagery, naming, pricing, rental rate, wood finish, and payout details.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2EFE9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Top Image Preview & Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white p-4 rounded-lg border border-[#E7E5E4]">
            <div className="sm:col-span-5 aspect-[4/3] rounded-md overflow-hidden bg-[#F2EFE9] border border-[#E7E5E4]">
              <img src={imageUrl} alt={title || 'Furniture preview'} className="w-full h-full object-cover" />
            </div>
            <div className="sm:col-span-7 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#1C1917]">
                  {lang === 'rw' ? 'Ifoto y’igicuruzwa' : 'Product Photo'}
                </span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#7C4D25] text-white rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap">
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{lang === 'rw' ? 'Shyiramo Ifoto Nshya' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadImage}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {STUDIO_IMAGES.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImageUrl(src)}
                    className={`aspect-square rounded overflow-hidden border cursor-pointer ${
                      imageUrl === src
                        ? 'border-[#7C4D25] ring-2 ring-[#7C4D25]/40'
                        : 'border-[#E7E5E4]'
                    }`}
                  >
                    <img src={src} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Izina (English / Global)' : 'Title (English)'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kigali Handcrafted Salon Sofa"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Izina mu Kinyarwanda' : 'Title (Kinyarwanda)'}
              </label>
              <input
                type="text"
                value={titleRw}
                onChange={(e) => setTitleRw(e.target.value)}
                placeholder="e.g. Salon Ikoze Neza mu Giti"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Icyiciro' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              >
                <option value="sofas">{t.catSofas}</option>
                <option value="dining">{t.catDining}</option>
                <option value="wardrobes">{t.catWardrobes}</option>
                <option value="beds">{t.catBeds}</option>
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
                className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              >
                <option value="sale">{lang === 'rw' ? 'Kugurisha Gusa (Sale)' : 'Sale Only'}</option>
                <option value="rent">{lang === 'rw' ? 'Gukodesha Gusa (Rent)' : 'Rent Daily Only'}</option>
                <option value="both">{lang === 'rw' ? 'Kugurisha & Gukodesha' : 'Both Sale & Rent'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Igiciro cyo Kugura (RWF)' : 'Sale Price (RWF)'}
              </label>
              <input
                type="number"
                min={500}
                step={500}
                required
                value={priceRwf}
                onChange={(e) => setPriceRwf(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
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
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.fabricLabel}</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.dimensionsLabel}</label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Aho biherereye (Location)' : 'Workshop Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {lang === 'rw' ? 'Iminsi yo gutegura' : 'Lead Days'}
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.payMomoCode}</label>
              <input
                type="text"
                value={momoCode}
                onChange={(e) => setMomoCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.payPhone}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">{t.payBank}</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">{t.notesLabel}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lang === 'rw'
                  ? 'Sobanura ubwiza bw’igikoresho, ibara, cyangwa uburyo bwo kugigeza ku mukiriya...'
                  : 'Describe finish, joinery, cushion comfort, or event rental terms...'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
            />
          </div>

          {error && (
            <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E7E5E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
            >
              {lang === 'rw' ? 'Funga' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {busy
                  ? '...'
                  : isEditing
                  ? lang === 'rw'
                    ? 'Bika Impinduka'
                    : 'Save Changes'
                  : lang === 'rw'
                  ? 'Ongeraho ku Rubuga'
                  : 'Publish to Catalog'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
