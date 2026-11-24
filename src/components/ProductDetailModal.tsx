import { useEffect, useRef, useState } from 'react';
import {
  X,
  Phone,
  Smartphone,
  Landmark,
  Truck,
  Send,
  CheckCircle2,
  MapPin,
  Armchair,
  MessageSquare,
  ImagePlus,
  Pencil,
  Heart,
  Link2,
  Check,
  ThumbsUp,
} from 'lucide-react';
import {
  ChatMessage,
  Conversation,
  GeoLocation,
  Language,
  Order,
  OrderType,
  PaymentMethod,
  Product,
  PublicUser,
} from '../types';
import { getCopy } from '../i18n';
import { compressImageFile, formatRwf } from '../utils/image';
import { createOrder, fetchMessages, openConversation, sendChatMessage } from '../api';
import { DeliveryMap, haversineKm, KIGALI_ZONES } from './DeliveryMap';
import { RwandaLocationPicker } from './RwandaLocationPicker';

interface ProductDetailModalProps {
  lang: Language;
  product: Product;
  user: PublicUser | null;
  buyerLocation: GeoLocation;
  onBuyerLocationChange: (loc: GeoLocation) => void;
  onClose: () => void;
  onOpenAuth: () => void;
  onOrderCreated: (order: Order) => void;
  onEditProduct?: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
  onToggleLike?: (productId: string) => void;
}

export function ProductDetailModal({
  lang,
  product,
  user,
  buyerLocation,
  onBuyerLocationChange,
  onClose,
  onOpenAuth,
  onOrderCreated,
  onEditProduct,
  isWishlisted = false,
  onToggleWishlist,
  onToggleLike,
}: ProductDetailModalProps) {
  const t = getCopy(lang);
  const supportsRental =
    (product.listingMode === 'rent' || product.listingMode === 'both') &&
    typeof product.rentalPricePerDayRwf === 'number' &&
    product.rentalPricePerDayRwf > 0;

  const [orderMode, setOrderMode] = useState<'purchase' | 'custom' | 'rent'>(
    product.listingMode === 'rent' ? 'rent' : 'purchase'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo_code');
  const [fabricChoice, setFabricChoice] = useState(product.material);
  const [dimensions, setDimensions] = useState(product.dimensions);
  const [rentalDays, setRentalDays] = useState(2);
  const [rentalQuantity, setRentalQuantity] = useState(20);
  const [deliveryAddress, setDeliveryAddress] = useState(
    buyerLocation.label || user?.location || 'Kigali, Rwanda'
  );
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [agreedPrice, setAgreedPrice] = useState<number>(product.priceRwf);

  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Live Online Chat State with Image Attachment
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [offerInput, setOfferInput] = useState('');
  const [chatImageUrl, setChatImageUrl] = useState<string>('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  async function handleCopySingleProductLink() {
    const url = `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  }

  const title = lang === 'rw' ? product.titleRw : product.title;
  const description = lang === 'rw' ? product.descriptionRw : product.description;

  const computedOrderTotal =
    orderMode === 'rent' && supportsRental
      ? (product.rentalPricePerDayRwf || 0) * Math.max(1, rentalDays) * Math.max(1, rentalQuantity)
      : agreedPrice;

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function initChat() {
      try {
        const res = await openConversation({
          productId: product.id,
          sellerId: product.sellerId,
          sellerName: product.sellerName,
          workshopName: product.workshopName,
          productTitle: product.title,
          productImageUrl: product.imageUrl,
        });
        if (!active) return;
        setConversation(res.conversation);
        setMessages(res.messages);
        if (res.conversation.negotiatedPriceRwf) {
          setAgreedPrice(res.conversation.negotiatedPriceRwf);
        }
      } catch (err) {
        if (active) {
          setChatError(err instanceof Error ? err.message : 'Could not load chat');
        }
      }
    }

    initChat();
    return () => {
      active = false;
    };
  }, [user, product]);

  useEffect(() => {
    if (!user || !conversation) return;
    const convId = conversation.id;
    const interval = setInterval(async () => {
      try {
        const res = await fetchMessages(convId);
        setMessages(res.messages);
        if (res.conversation.negotiatedPriceRwf) {
          setAgreedPrice(res.conversation.negotiatedPriceRwf);
        }
      } catch {
        // silent poll retry
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [user, conversation?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length]);

  const origin = product.originCoords || KIGALI_ZONES[0];
  const distanceKm = haversineKm(origin, buyerLocation);

  async function handleOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setOrderError('');
    setOrderBusy(true);
    try {
      const orderType: OrderType = orderMode;
      const res = await createOrder({
        orderType,
        productId: product.id,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        workshopName: product.workshopName,
        productTitle: title,
        referenceImageUrl: product.imageUrl,
        fabricChoice: orderMode === 'custom' ? fabricChoice : undefined,
        dimensions: orderMode === 'custom' ? dimensions : product.dimensions,
        rentalDays: orderMode === 'rent' ? rentalDays : undefined,
        rentalQuantity: orderMode === 'rent' ? rentalQuantity : undefined,
        notes,
        deliveryAddress,
        buyerCoords: buyerLocation,
        distanceKm,
        agreedPriceRwf: computedOrderTotal,
        paymentMethod,
        paymentRef,
      });
      setConfirmedOrder(res.order);
      onOrderCreated(res.order);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Order failed.');
    } finally {
      setOrderBusy(false);
    }
  }

  async function handleChatImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatError('');
    try {
      const compressed = await compressImageFile(file, 900);
      setChatImageUrl(compressed);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Could not attach image.');
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!conversation) return;
    const trimmed = chatText.trim();
    const parsedOffer = offerInput.trim() ? Number(offerInput.replace(/[^\d]/g, '')) : undefined;
    if (!trimmed && !parsedOffer && !chatImageUrl) return;

    setChatBusy(true);
    setChatError('');
    try {
      const res = await sendChatMessage(conversation.id, {
        text:
          trimmed ||
          (chatImageUrl
            ? lang === 'rw'
              ? 'Nohereje ifoto'
              : 'Shared a photo'
            : lang === 'rw'
            ? `Natanze igiciro cya ${formatRwf(parsedOffer || 0)}`
            : `Proposed price: ${formatRwf(parsedOffer || 0)}`),
        imageUrl: chatImageUrl || undefined,
        offerPriceRwf: parsedOffer && parsedOffer >= 1000 ? parsedOffer : undefined,
      });
      setMessages((prev) => [...prev, res.message]);
      setConversation(res.conversation);
      if (res.conversation.negotiatedPriceRwf) {
        setAgreedPrice(res.conversation.negotiatedPriceRwf);
      }
      setChatText('');
      setOfferInput('');
      setChatImageUrl('');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setChatBusy(false);
    }
  }

  function formatMsgTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-w-5xl mx-auto bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl shadow-2xl overflow-hidden my-4">
        {/* Top Modal Bar */}
        <div className="px-6 py-4 bg-white border-b border-[#E7E5E4] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-[#78716C] truncate">
              {product.workshopName} · {product.location}
            </p>
            <h2 className="font-display text-xl font-medium text-[#1C1917] truncate">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySingleProductLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] cursor-pointer whitespace-nowrap"
            >
              {linkCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Link2 className="w-3.5 h-3.5 text-[#7C4D25]" />
              )}
              <span>
                {linkCopied
                  ? lang === 'rw'
                    ? 'Link Yakopererwe'
                    : 'Link Copied'
                  : lang === 'rw'
                  ? 'Kopera Link Gusa'
                  : 'Copy Link Only'}
              </span>
            </button>
            {onToggleLike && (
              <button
                type="button"
                onClick={() => onToggleLike(product.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer whitespace-nowrap ${
                  product.likedByViewer
                    ? 'bg-[#7C4D25] text-white border-[#7C4D25]'
                    : 'bg-[#F2EFE9] text-[#1C1917] border-[#D6D3D1] hover:bg-[#E7E3DA]'
                }`}
              >
                <ThumbsUp
                  className={`w-3.5 h-3.5 ${product.likedByViewer ? 'fill-white' : 'text-[#7C4D25]'}`}
                />
                <span>
                  {lang === 'rw' ? 'Kunda' : 'Like'} ({product.likesCount || 0})
                </span>
              </button>
            )}
            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer whitespace-nowrap ${
                  isWishlisted
                    ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                    : 'bg-[#F2EFE9] text-[#1C1917] border-[#D6D3D1] hover:bg-[#E7E3DA]'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    isWishlisted ? 'text-[#B91C1C] fill-[#B91C1C]' : 'text-[#7C4D25]'
                  }`}
                />
                <span>{isWishlisted ? t.wishlistSaved : t.wishlistSave}</span>
              </button>
            )}
            {onEditProduct && (
              <button
                type="button"
                onClick={() => onEditProduct(product)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] cursor-pointer whitespace-nowrap"
              >
                <Pencil className="w-3.5 h-3.5 text-[#7C4D25]" />
                <span>{lang === 'rw' ? 'Hindura Igicuruzwa' : 'Edit Item'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2EFE9] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Strict 50/50 Half-and-Half Design & Details Module */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-[#E7E5E4]">
          {/* Left 50%: Product Imagery, Specs & Seller Card */}
          <div className="p-6 bg-white border-b lg:border-b-0 lg:border-r border-[#E7E5E4] space-y-5">
            <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-[#F2EFE9] border border-[#E7E5E4]">
              <img
                src={product.imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-mono text-2xl font-semibold text-[#1C1917] tabular-nums block">
                    {formatRwf(agreedPrice)}
                  </span>
                  {supportsRental && (
                    <span className="font-mono text-xs text-[#7C4D25] tabular-nums">
                      {lang === 'rw' ? 'Gukodesha ku munsi:' : 'Daily rental rate:'}{' '}
                      {formatRwf(product.rentalPricePerDayRwf || 0)}/day
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#57534E] tabular-nums shrink-0">
                  {product.leadTimeDays} {t.daysToMake}
                </span>
              </div>

              <p className="text-sm text-[#44403C] leading-relaxed">{description}</p>

              <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E7E5E4] text-xs">
                <div>
                  <dt className="text-[#78716C]">{t.fabricLabel}</dt>
                  <dd className="font-medium text-[#1C1917] mt-0.5">{product.material}</dd>
                </div>
                <div>
                  <dt className="text-[#78716C]">{t.dimensionsLabel}</dt>
                  <dd className="font-mono text-[#1C1917] mt-0.5 tabular-nums">{product.dimensions}</dd>
                </div>
              </dl>

              <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E7E5E4] space-y-1.5">
                <p className="text-xs font-medium text-[#78716C]">{t.sellerOwner}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1C1917]">{product.sellerName}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-[#57534E]">
                    <MapPin className="w-3.5 h-3.5 text-[#7C4D25]" />
                    {product.location}
                  </span>
                </div>
                <p className="text-xs text-[#57534E]">{product.workshopName}</p>
              </div>
            </div>
          </div>

          {/* Right 50%: Purchase / Custom / Rent + Cascading Rwanda Location + Payment Choice */}
          <div className="p-6 space-y-4">
            <div className="inline-flex w-full p-1 bg-[#F2EFE9] rounded-lg border border-[#E7E5E4]">
              <button
                type="button"
                onClick={() => setOrderMode('purchase')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  orderMode === 'purchase'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {t.orderModePurchase}
              </button>
              <button
                type="button"
                onClick={() => setOrderMode('custom')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  orderMode === 'custom'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {t.orderModeCustom}
              </button>
              {supportsRental && (
                <button
                  type="button"
                  onClick={() => setOrderMode('rent')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    orderMode === 'rent'
                      ? 'bg-white text-[#7C4D25] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {t.orderModeRent}
                </button>
              )}
            </div>

            {confirmedOrder ? (
              <div className="p-5 rounded-lg bg-white border border-[#D6D3D1] space-y-3">
                <div className="flex items-center gap-2 text-[#166534]">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-semibold">
                    Order #{confirmedOrder.id} Confirmed
                  </h3>
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  {confirmedOrder.workshopName} received your {confirmedOrder.orderType} request for{' '}
                  {formatRwf(confirmedOrder.agreedPriceRwf)} ({confirmedOrder.deliveryAddress}).
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmedOrder(null)}
                  className="text-xs font-medium text-[#7C4D25] hover:underline cursor-pointer"
                >
                  Place another order
                </button>
              </div>
            ) : (
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                {orderMode === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">
                        {t.fabricLabel}
                      </label>
                      <input
                        type="text"
                        value={fabricChoice}
                        onChange={(e) => setFabricChoice(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">
                        {t.dimensionsLabel}
                      </label>
                      <input
                        type="text"
                        value={dimensions}
                        onChange={(e) => setDimensions(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                      />
                    </div>
                  </div>
                )}

                {orderMode === 'rent' && supportsRental && (
                  <div className="p-3.5 rounded-lg bg-white border border-[#E7E5E4] grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">
                        {lang === 'rw' ? 'Umubare w’Intebe' : 'Quantity (Chairs)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={2000}
                        value={rentalQuantity}
                        onChange={(e) => setRentalQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#D6D3D1] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">
                        {lang === 'rw' ? 'Iminsi yo Gukodesha' : 'Rental Days'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={rentalDays}
                        onChange={(e) => setRentalDays(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#D6D3D1] rounded-md"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-[#7C4D25] font-mono tabular-nums">
                      {rentalQuantity} × {rentalDays}d × {formatRwf(product.rentalPricePerDayRwf || 0)} ={' '}
                      <strong>{formatRwf(computedOrderTotal)}</strong>
                    </p>
                  </div>
                )}

                {/* Country -> Province -> District -> Sector -> Cell -> Village Picker */}
                <RwandaLocationPicker
                  lang={lang}
                  onLocationChange={(addr, coords) => {
                    setDeliveryAddress(addr);
                    onBuyerLocationChange(coords);
                  }}
                />

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#1C1917]">
                    {t.payOnlineTitle}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('momo_code')}
                      className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        paymentMethod === 'momo_code'
                          ? 'border-[#7C4D25] bg-white text-[#1C1917]'
                          : 'border-[#E7E5E4] bg-[#F2EFE9]/60 text-[#57534E] hover:bg-white'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-[#7C4D25] mb-1" />
                      <span className="block text-[11px] font-medium whitespace-nowrap">
                        {t.payMomoCode}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('phone')}
                      className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        paymentMethod === 'phone'
                          ? 'border-[#7C4D25] bg-white text-[#1C1917]'
                          : 'border-[#E7E5E4] bg-[#F2EFE9]/60 text-[#57534E] hover:bg-white'
                      }`}
                    >
                      <Phone className="w-4 h-4 text-[#7C4D25] mb-1" />
                      <span className="block text-[11px] font-medium whitespace-nowrap">
                        {t.payPhone}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank')}
                      className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        paymentMethod === 'bank'
                          ? 'border-[#7C4D25] bg-white text-[#1C1917]'
                          : 'border-[#E7E5E4] bg-[#F2EFE9]/60 text-[#57534E] hover:bg-white'
                      }`}
                    >
                      <Landmark className="w-4 h-4 text-[#7C4D25] mb-1" />
                      <span className="block text-[11px] font-medium whitespace-nowrap">
                        {t.payBank}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        paymentMethod === 'cod'
                          ? 'border-[#7C4D25] bg-white text-[#1C1917]'
                          : 'border-[#E7E5E4] bg-[#F2EFE9]/60 text-[#57534E] hover:bg-white'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-[#7C4D25] mb-1" />
                      <span className="block text-[11px] font-medium whitespace-nowrap">
                        {t.payCod}
                      </span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-md bg-white border border-[#E7E5E4] text-xs">
                    {paymentMethod === 'momo_code' && (
                      <p className="font-mono font-semibold text-[#1C1917] tabular-nums">
                        {product.momoCode}
                      </p>
                    )}
                    {paymentMethod === 'phone' && (
                      <p className="font-mono font-semibold text-[#1C1917] tabular-nums">
                        {product.phone} · {product.sellerName}
                      </p>
                    )}
                    {paymentMethod === 'bank' && (
                      <p className="font-mono font-semibold text-[#1C1917] tabular-nums">
                        {product.bankAccount}
                      </p>
                    )}
                    {paymentMethod === 'cod' && (
                      <p className="text-[#44403C]">
                        {lang === 'rw'
                          ? 'Uzakwishyura igihe bikugezeho (Cash or MoMo on delivery).'
                          : 'Pay via Cash or Mobile Money upon delivery verification.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#44403C] mb-1">
                      {t.paymentRefLabel}
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder={paymentMethod === 'cod' ? 'Pay on arrival' : 'TXN-89421 / 078...'}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#44403C] mb-1">
                      {t.notesLabel}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={lang === 'rw' ? 'Icyo wakongeraho...' : 'Delivery / event timing...'}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                    />
                  </div>
                </div>

                {orderError && (
                  <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-md">
                    {orderError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={orderBusy}
                  className="w-full py-3 px-5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {user
                    ? orderBusy
                      ? '...'
                      : `${t.confirmOrderBtn} (${formatRwf(computedOrderTotal)})`
                    : t.signIn}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Interactive Origin-to-Customer Route Map */}
        <div className="p-6 bg-[#FAF9F6] border-b border-[#E7E5E4]">
          <DeliveryMap
            lang={lang}
            origin={origin}
            workshopName={product.workshopName}
            buyerLocation={buyerLocation}
            onBuyerLocationChange={onBuyerLocationChange}
            driverCoords={confirmedOrder?.driverCoords}
            driverLabel={confirmedOrder?.driverLocationLabel}
            driverUpdatedAt={confirmedOrder?.driverUpdatedAt}
            compact
          />
        </div>

        {/* Upgraded Chat Module: Sender Photo, Timestamp, Distinct Sender/Receiver Sides & Image Sharing */}
        <div className="p-6 bg-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E7E5E4]">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-[#7C4D25]" />
              <div>
                <h3 className="text-sm font-semibold text-[#1C1917]">{t.chatTitle}</h3>
                <p className="text-xs text-[#57534E]">{t.chatSubtitle}</p>
              </div>
            </div>
            {conversation?.negotiatedPriceRwf && (
              <span className="font-mono text-xs font-medium text-[#7C4D25] tabular-nums">
                {formatRwf(conversation.negotiatedPriceRwf)}
              </span>
            )}
          </div>

          {!user ? (
            <div className="p-6 rounded-lg bg-[#FAF9F6] border border-[#E7E5E4] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Armchair className="w-5 h-5 text-[#7C4D25] shrink-0" />
                <p className="text-sm text-[#44403C]">{t.signInToChat}</p>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-medium text-white bg-[#1C1917] rounded-md hover:bg-[#332E2A] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signIn}
              </button>
            </div>
          ) : (
            <>
              <div className="h-64 overflow-y-auto rounded-lg bg-[#FAF9F6] border border-[#E7E5E4] p-4 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-xs text-[#78716C] text-center py-12">
                    Start chatting with {product.sellerName} to share photos or negotiate pricing.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    const avatarSrc = msg.senderAvatarUrl;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Sender Photo Avatar */}
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={msg.senderName}
                            className="w-8 h-8 rounded-full object-cover border border-[#D6D3D1] shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                              isMine
                                ? 'bg-[#7C4D25] text-white'
                                : 'bg-[#E7E5E4] text-[#1C1917]'
                            }`}
                          >
                            {msg.senderName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm space-y-1.5 ${
                            isMine
                              ? 'bg-[#1C1917] text-white rounded-br-xs'
                              : 'bg-white border border-[#E7E5E4] text-[#1C1917] rounded-bl-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[11px] opacity-75">
                            <span className="font-medium">{msg.senderName}</span>
                            <span className="font-mono tabular-nums">{formatMsgTime(msg.createdAt)}</span>
                          </div>

                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Shared attachment"
                              className="max-h-48 w-auto rounded-md object-cover border border-black/10"
                            />
                          )}

                          {msg.audioUrl && (
                            <audio controls src={msg.audioUrl} className="w-full h-8 min-w-[180px]" />
                          )}

                          <p className="leading-relaxed">{msg.text}</p>

                          {msg.offerPriceRwf && (
                            <p className="font-mono text-xs pt-1.5 border-t border-current/15 tabular-nums">
                              Offer: {formatRwf(msg.offerPriceRwf)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {chatError && <p className="text-xs text-[#B91C1C]">{chatError}</p>}

              {chatImageUrl && (
                <div className="flex items-center gap-3 p-2.5 bg-[#FAF9F6] border border-[#E7E5E4] rounded-md">
                  <img
                    src={chatImageUrl}
                    alt="Attachment preview"
                    className="w-12 h-12 rounded object-cover"
                  />
                  <span className="text-xs text-[#57534E] flex-1">
                    {lang === 'rw' ? 'Ifoto yateguwe koherezwa' : 'Photo attached'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChatImageUrl('')}
                    className="text-xs text-[#B91C1C] hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2.5">
                <label
                  title={lang === 'rw' ? 'Ohereza Ifoto' : 'Attach Photo'}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] cursor-pointer shrink-0"
                >
                  <ImagePlus className="w-4 h-4 text-[#7C4D25]" />
                  <span>{lang === 'rw' ? 'Ifoto' : 'Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleChatImagePick}
                    className="sr-only"
                  />
                </label>

                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={t.chatPlaceholder}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
                />
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={offerInput}
                  onChange={(e) => setOfferInput(e.target.value)}
                  placeholder={t.offerPlaceholder}
                  className="sm:w-36 px-3.5 py-2.5 text-sm font-mono bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] tabular-nums focus:outline-none focus:border-[#7C4D25]"
                />
                <button
                  type="submit"
                  disabled={chatBusy}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.sendBtn}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
