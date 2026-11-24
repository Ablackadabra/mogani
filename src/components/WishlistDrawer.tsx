import { Heart, MessageSquare, ShoppingBag, Trash2, X } from 'lucide-react';
import { Language, Product, PublicUser } from '../types';
import { getCopy } from '../i18n';
import { formatRwf } from '../utils/image';

interface WishlistDrawerProps {
  lang: Language;
  user: PublicUser | null;
  products: Product[];
  wishlistIds: string[];
  onClose: () => void;
  onRemove: (productId: string) => void;
  onClearAll: () => void;
  onSelectProduct: (product: Product) => void;
  onInquireProduct: (product: Product) => void;
  onOpenAuth: () => void;
}

export function WishlistDrawer({
  lang,
  user,
  products,
  wishlistIds,
  onClose,
  onRemove,
  onClearAll,
  onSelectProduct,
  onInquireProduct,
  onOpenAuth,
}: WishlistDrawerProps) {
  const t = getCopy(lang);
  const savedProducts = wishlistIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const totalEstimateRwf = savedProducts.reduce((sum, p) => sum + p.priceRwf, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t.wishlistTitle}
    >
      <div className="w-full max-w-md bg-[#FAF9F6] h-full border-l border-[#E7E5E4] flex flex-col justify-between shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E7E5E4] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Heart className="w-5 h-5 text-[#B91C1C] fill-[#B91C1C] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#1C1917] truncate">
                {t.wishlistTitle} ({savedProducts.length})
              </h2>
              <p className="text-xs text-[#57534E] truncate">{t.wishlistSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-[#57534E] hover:text-[#1C1917] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!user && savedProducts.length > 0 && (
            <div className="p-3.5 rounded-lg bg-[#F5F2EB] border border-[#D6D3D1] flex items-center justify-between gap-3 text-xs">
              <p className="text-[#44403C]">
                {lang === 'rw'
                  ? 'Injira kugira ngo ubike Wishlist yawe kuri konti yawe itazibagirana.'
                  : 'Sign in to sync your saved wishlist to your account permanently.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-3 py-1.5 font-medium text-white bg-[#7C4D25] rounded hover:bg-[#633D1D] cursor-pointer whitespace-nowrap shrink-0"
              >
                {t.signIn}
              </button>
            </div>
          )}

          {savedProducts.length === 0 ? (
            <div className="p-8 bg-white border border-[#E7E5E4] rounded-lg text-center space-y-3">
              <Heart className="w-7 h-7 text-[#7C4D25] mx-auto" />
              <p className="text-sm text-[#57534E] leading-relaxed">{t.wishlistEmpty}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedProducts.map((product) => {
                const title = lang === 'rw' ? product.titleRw : product.title;
                const hasRental =
                  (product.listingMode === 'rent' || product.listingMode === 'both') &&
                  typeof product.rentalPricePerDayRwf === 'number' &&
                  product.rentalPricePerDayRwf > 0;

                return (
                  <div
                    key={product.id}
                    className="p-4 bg-white border border-[#E7E5E4] rounded-lg space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={product.imageUrl}
                        alt={title}
                        className="w-20 h-16 rounded-md object-cover shrink-0 bg-[#F2EFE9] border border-[#E7E5E4]"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold text-[#1C1917] line-clamp-1">{title}</p>
                        <p className="text-xs text-[#57534E] truncate">
                          {product.workshopName} · {product.location}
                        </p>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs font-semibold text-[#1C1917] tabular-nums">
                            {formatRwf(product.priceRwf)}
                          </span>
                          {hasRental && (
                            <span className="font-mono text-[11px] text-[#7C4D25] tabular-nums">
                              · {formatRwf(product.rentalPricePerDayRwf || 0)}/day
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(product.id)}
                        aria-label="Remove from wishlist"
                        className="p-1.5 text-[#78716C] hover:text-[#B91C1C] cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F2EFE9]">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectProduct(product);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{lang === 'rw' ? 'Gura / Command' : 'Order / Details'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onInquireProduct(product);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] cursor-pointer whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#7C4D25]" />
                        <span>{lang === 'rw' ? 'Baza Umucuruzi' : 'Inquire in Chat'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {savedProducts.length > 0 && (
          <div className="p-5 bg-white border-t border-[#E7E5E4] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#57534E]">
                {lang === 'rw' ? 'Igiteranyo cy’Ibiciro' : 'Estimated Total'}
              </span>
              <span className="font-mono font-semibold text-[#1C1917] tabular-nums">
                {formatRwf(totalEstimateRwf)}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearAll}
              className="w-full py-2 px-4 text-xs font-medium text-[#57534E] bg-[#FAF9F6] border border-[#D6D3D1] rounded-md hover:text-[#B91C1C] hover:border-[#FECACA] cursor-pointer"
            >
              {lang === 'rw' ? 'Siba Wishlist Yose' : 'Clear Saved Wishlist'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
