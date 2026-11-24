import { useState } from 'react';
import { Upload, Check, Wrench, MessageSquare } from 'lucide-react';
import { GeoLocation, Language, Order, PaymentMethod, Product, PublicUser } from '../types';
import { getCopy } from '../i18n';
import { compressImageFile, formatRwf } from '../utils/image';
import { createOrder, openConversation, sendChatMessage } from '../api';
import { RwandaLocationPicker } from './RwandaLocationPicker';

interface RepairStudioProps {
  lang: Language;
  products: Product[];
  user: PublicUser | null;
  onOpenAuth: () => void;
  onOrderCreated: (order: Order) => void;
  onConversationOpened: (conversationId: string) => void;
}

const REPAIR_TYPES = {
  rw: [
    'Guhindura igitambaro / uruhu (Reupholstery)',
    'Gusana imbaho n’amaguru y’intebe (Frame Repair)',
    'Gusimbura iponji n’imisego (Foam & Cushion Rebuild)',
    'Gusiga vernis no kuvugurura ibara (Wood Polish)',
  ],
  en: [
    'Full Fabric or Leather Reupholstery',
    'Hardwood Frame & Joint Restoration',
    'High-Density Foam & Cushion Replacement',
    'Sanding, Staining & Wood Varnish Finish',
  ],
};

export function RepairStudio({
  lang,
  products,
  user,
  onOpenAuth,
  onOrderCreated,
  onConversationOpened,
}: RepairStudioProps) {
  const t = getCopy(lang);
  const workshops = Array.from(
    new Map(
      products.map((p) => [
        p.sellerId,
        {
          sellerId: p.sellerId,
          sellerName: p.sellerName,
          workshopName: p.workshopName,
          location: p.location,
          momoCode: p.momoCode,
          phone: p.phone,
          bankAccount: p.bankAccount,
        },
      ])
    ).values()
  );

  const [selectedRefUrl, setSelectedRefUrl] = useState<string>(
    products[0]?.imageUrl || '/src/assets/images/repair_craftsman_studio_1795425663920.jpg'
  );
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    workshops[0]?.sellerId || 'workshop-nyamirambo-craft'
  );
  const repairOptions = lang === 'rw' ? REPAIR_TYPES.rw : REPAIR_TYPES.en;
  const [repairType, setRepairType] = useState<string>(repairOptions[0]);
  const [fabricChoice, setFabricChoice] = useState('Heavy Linen / Velvet');
  const [budgetRwf, setBudgetRwf] = useState('85000');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.location || 'Kigali, Rwanda');
  const [buyerCoords, setBuyerCoords] = useState<GeoLocation | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo_code');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  const activeWorkshop =
    workshops.find((w) => w.sellerId === selectedSellerId) || workshops[0];

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressImageFile(file);
      setUploadedPhotoUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process photo.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const numericPrice = Math.max(0, Number(budgetRwf) || 0);
      const res = await createOrder({
        orderType: 'repair',
        sellerId: activeWorkshop?.sellerId,
        sellerName: activeWorkshop?.sellerName,
        workshopName: activeWorkshop?.workshopName,
        productTitle: `Repair: ${repairType}`,
        referenceImageUrl: selectedRefUrl,
        uploadedPhotoUrl: uploadedPhotoUrl || undefined,
        fabricChoice,
        repairType,
        notes,
        deliveryAddress,
        buyerCoords,
        agreedPriceRwf: numericPrice,
        paymentMethod,
        paymentRef,
      });

      const convRes = await openConversation({
        sellerId: activeWorkshop?.sellerId,
        sellerName: activeWorkshop?.sellerName,
        workshopName: activeWorkshop?.workshopName,
        productTitle: `Repair Request #${res.order.id}`,
        productImageUrl: uploadedPhotoUrl || selectedRefUrl,
      });
      await sendChatMessage(convRes.conversation.id, {
        text: `${repairType} — ${fabricChoice}. ${notes || deliveryAddress}`,
        offerPriceRwf: numericPrice >= 1000 ? numericPrice : undefined,
      });

      setSubmittedOrder(res.order);
      onOrderCreated(res.order);
      onConversationOpened(convRes.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit repair request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-10">
      {/* Studio Overview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pb-10 border-b border-[#E7E5E4]">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#7C4D25]">
            <Wrench className="w-4 h-4" />
            <span>{lang === 'rw' ? 'Serivisi yo Gusana Intebe' : 'Atelier Restoration'}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#1C1917] [text-wrap:balance]">
            {t.repairTitle}
          </h1>
          <p className="text-base text-[#57534E] leading-relaxed max-w-prose">
            {t.repairSubtitle}
          </p>
        </div>
        <div className="lg:col-span-6">
          <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-[#E7E5E4] bg-[#F2EFE9]">
            <img
              src="/src/assets/images/repair_craftsman_studio_1795425663920.jpg"
              alt="Furniture craftsman reupholstering a classic hardwood chair in the workshop"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Repair Builder Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Style Reference Picker + Custom Photo Upload */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[#1C1917]">{t.repairStep1}</h2>
            <p className="text-xs text-[#57534E]">
              {lang === 'rw'
                ? 'Kanda ku ifoto imwe muri izi ziri hasi cyangwa ukoreshe buto yo gushyiramo ifoto yawe.'
                : 'Select one of the catalog finishes below, or upload a photo of your own chair.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.slice(0, 6).map((item) => {
              const selected = selectedRefUrl === item.imageUrl && !uploadedPhotoUrl;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedRefUrl(item.imageUrl);
                  }}
                  className={`group relative rounded-lg overflow-hidden border text-left transition-all cursor-pointer ${
                    selectedRefUrl === item.imageUrl
                      ? 'border-[#7C4D25] ring-2 ring-[#7C4D25]/30'
                      : 'border-[#E7E5E4] hover:border-[#A8A29E]'
                  }`}
                >
                  <div className="aspect-[4/3] bg-[#F2EFE9]">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2.5 bg-white">
                    <p className="text-xs font-medium text-[#1C1917] truncate">
                      {lang === 'rw' ? item.titleRw : item.title}
                    </p>
                  </div>
                  {selected && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#7C4D25] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Chair Photo Upload */}
          <div className="p-5 rounded-lg bg-white border border-[#E7E5E4] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  {lang === 'rw'
                    ? 'Shyiramo Ifoto y’Intebe Yawe (Optional)'
                    : 'Upload Photo of Your Chair or Desired Finish'}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {lang === 'rw'
                    ? 'Ifoto izafasha umufundi kumenya ibikenewe n’igiciro cy’ukuri.'
                    : 'Helps the workshop assess frame condition and fabric yardage.'}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5 text-[#7C4D25]" />
                <span>{t.repairUploadBtn}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {uploadedPhotoUrl && (
              <div className="flex items-center gap-4 pt-2">
                <img
                  src={uploadedPhotoUrl}
                  alt="Uploaded chair preview"
                  className="w-28 h-20 object-cover rounded-md border border-[#E7E5E4]"
                />
                <button
                  type="button"
                  onClick={() => setUploadedPhotoUrl('')}
                  className="text-xs text-[#B91C1C] hover:underline cursor-pointer"
                >
                  {lang === 'rw' ? 'Kuraho iyi foto' : 'Remove uploaded photo'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Workshop, Repair Scope, Payment & Submit */}
        <div className="lg:col-span-5">
          <div className="p-6 bg-white border border-[#E7E5E4] rounded-lg space-y-4">
            <h2 className="text-base font-semibold text-[#1C1917]">
              {lang === 'rw' ? '2. Ibisobanuro byo Gusana' : '2. Restoration Details'}
            </h2>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {t.repairWorkshopLabel}
              </label>
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
              >
                {workshops.map((w) => (
                  <option key={w.sellerId} value={w.sellerId}>
                    {w.workshopName} ({w.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {t.repairTypeLabel}
              </label>
              <select
                value={repairType}
                onChange={(e) => setRepairType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
              >
                {repairOptions.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">
                  {t.fabricLabel}
                </label>
                <input
                  type="text"
                  value={fabricChoice}
                  onChange={(e) => setFabricChoice(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">
                  {lang === 'rw' ? 'Ingengo y’imari (RWF)' : 'Estimated Budget (RWF)'}
                </label>
                <input
                  type="number"
                  min={5000}
                  step={1000}
                  value={budgetRwf}
                  onChange={(e) => setBudgetRwf(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
                />
              </div>
            </div>

            <RwandaLocationPicker
              lang={lang}
              onLocationChange={(addr, coords) => {
                setDeliveryAddress(addr);
                setBuyerCoords(coords);
              }}
            />

            {activeWorkshop && (
              <div className="p-3.5 rounded-md bg-[#FAF9F6] border border-[#E7E5E4] space-y-2 text-xs">
                <p className="font-semibold text-[#1C1917]">{t.payOnlineTitle}</p>
                <div className="flex flex-wrap gap-2">
                  {(['momo_code', 'phone', 'bank'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-2.5 py-1 rounded border text-xs cursor-pointer ${
                        paymentMethod === m
                          ? 'bg-[#1C1917] text-white border-[#1C1917]'
                          : 'bg-white text-[#57534E] border-[#D6D3D1]'
                      }`}
                    >
                      {m === 'momo_code' ? t.payMomoCode : m === 'phone' ? t.payPhone : t.payBank}
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[#1C1917] tabular-nums">
                  {paymentMethod === 'momo_code'
                    ? activeWorkshop.momoCode
                    : paymentMethod === 'phone'
                    ? activeWorkshop.phone
                    : activeWorkshop.bankAccount}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {t.paymentRefLabel}
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder={lang === 'rw' ? 'Nimero ya MoMo cyangwa Refference' : 'Optional deposit reference'}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                {t.notesLabel}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  lang === 'rw'
                    ? 'Umubare w’intebe, aho zangiritse, cyangwa igihe bazitwarira...'
                    : 'Number of chairs, wood condition, or pickup schedule...'
                }
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            {submittedOrder && (
              <p className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-2 rounded-md">
                {lang === 'rw'
                  ? `Icyifuzo #${submittedOrder.id} cyoherejwe kuri ${submittedOrder.workshopName} (${formatRwf(
                      submittedOrder.agreedPriceRwf
                    )}).`
                  : `Repair request #${submittedOrder.id} sent to ${submittedOrder.workshopName}.`}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{user ? (busy ? '...' : t.repairSubmitBtn) : t.signIn}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
