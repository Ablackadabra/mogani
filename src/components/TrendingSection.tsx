import { useState } from 'react';
import {
  Armchair,
  ArrowRight,
  Check,
  Heart,
  Link2,
  ShoppingBag,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { Language, Product, ProductCategory } from '../types';
import { formatRwf } from '../utils/image';

interface TrendingSectionProps {
  lang: Language;
  products: Product[];
  wishlistIds: string[];
  mode: 'preview' | 'page';
  onSelectProduct: (product: Product) => void;
  onToggleLike: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  onOpenFullTrendingPage?: () => void;
  onBrowseCatalog?: () => void;
}

export function TrendingSection({
  lang,
  products,
  wishlistIds,
  mode,
  onSelectProduct,
  onToggleLike,
  onToggleWishlist,
  onOpenFullTrendingPage,
  onBrowseCatalog,
}: TrendingSectionProps) {
  const [selectedCat, setSelectedCat] = useState<'all' | ProductCategory>('all');
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Sort by genuine market love: (likesCount * 3 + wishlistCount * 2 + ordersCount * 5)
  const ranked = [...products]
    .filter((p) => (mode === 'page' && selectedCat !== 'all' ? p.category === selectedCat : true))
    .sort((a, b) => {
      const scoreA =
        a.popularityScore ??
        (a.likesCount || 0) * 3 + (a.wishlistCount || 0) * 2 + (a.ordersCount || 0) * 5;
      const scoreB =
        b.popularityScore ??
        (b.likesCount || 0) * 3 + (b.wishlistCount || 0) * 2 + (b.ordersCount || 0) * 5;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if ((b.ordersCount || 0) !== (a.ordersCount || 0)) {
        return (b.ordersCount || 0) - (a.ordersCount || 0);
      }
      if ((b.likesCount || 0) !== (a.likesCount || 0)) {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  const displayed = mode === 'preview' ? ranked.slice(0, 4) : ranked;

  async function handleCopyProductLink(e: React.MouseEvent, productId: string) {
    e.stopPropagation();
    const url = `${window.location.origin}/?product=${encodeURIComponent(productId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedProductId(productId);
      setTimeout(() => {
        setCopiedProductId((curr) => (curr === productId ? null : curr));
      }, 2200);
    } catch {
      // ignore clipboard errors
    }
  }

  const filterTabs: { id: 'all' | ProductCategory; label: string }[] = [
    { id: 'all', label: lang === 'rw' ? 'Byose' : 'All' },
    { id: 'sofas', label: lang === 'rw' ? 'Salon & Sofa' : 'Sofas' },
    { id: 'dining', label: lang === 'rw' ? 'Ameza' : 'Dining' },
    { id: 'wardrobes', label: lang === 'rw' ? 'Garde-robe' : 'Wardrobes' },
    { id: 'beds', label: lang === 'rw' ? 'Ibitanda' : 'Beds' },
    { id: 'rentals', label: lang === 'rw' ? 'Gukodesha' : 'Rentals' },
  ];

  return (
    <section
      id="trending-market-section"
      className={
        mode === 'preview'
          ? 'border-b border-[#E7E5E4] bg-white'
          : 'max-w-7xl mx-auto px-6 py-12 space-y-8'
      }
    >
      <div className={mode === 'preview' ? 'max-w-7xl mx-auto px-6 py-12 space-y-7' : 'space-y-7'}>
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E7E5E4]">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#7C4D25]">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'rw'
                  ? 'Ahantu Hambere · Ibyakunze ku Isoko'
                  : 'Featured First · Market Demand Leaderboard'}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1917] tracking-tight">
              {lang === 'rw'
                ? 'Ibicuruzwa Bikunzwe Cyane ku Isoko'
                : 'Most Loved Furniture on the Market'}
            </h2>
            <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
              {lang === 'rw'
                ? 'Ibicuruzwa bikunzwe n’abantu benshi bigaragara hano imbere biherekejwe n’umubare w’ababikunze (Likes), ababibitse muri Wishlist, n’ababiguriye.'
                : 'Live ranking of pieces loved, wishlisted, and ordered most by shoppers across Rwanda. Tap Like to vote for your favorites or copy a direct item link.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {mode === 'preview' && onOpenFullTrendingPage && (
              <button
                type="button"
                onClick={onOpenFullTrendingPage}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#1C1917] rounded-md hover:bg-[#332E2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>
                  {lang === 'rw'
                    ? 'Fungura Urubuga rw’Ibikunzwe Cyane'
                    : 'Open Most Loved Page'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#E5B748]" />
              </button>
            )}
            {mode === 'page' && onBrowseCatalog && (
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{lang === 'rw' ? 'Reba Catalog Yose' : 'Browse Full Catalog'}</span>
                <ArrowRight className="w-4 h-4 text-[#7C4D25]" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs in Full Page View */}
        {mode === 'page' && (
          <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg border border-[#E7E5E4] overflow-x-auto max-w-full">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCat(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCat === tab.id
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Ranked Cards Grid */}
        {displayed.length === 0 ? (
          <div className="py-12 text-center border border-[#E7E5E4] rounded-lg bg-[#FAF9F6] text-sm text-[#57534E]">
            {lang === 'rw'
              ? 'Nta bicuruzwa biri muri iki cyiciro ubu.'
              : 'No items found in this category yet.'}
          </div>
        ) : (
          <div
            className={
              mode === 'preview'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
                : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7'
            }
          >
            {displayed.map((product, idx) => {
              const title = lang === 'rw' ? product.titleRw : product.title;
              const imgFailed = failedImages[product.id];
              const isWishlisted = wishlistIds.includes(product.id);
              const isLiked = Boolean(product.likedByViewer);
              const likesCount = product.likesCount || 0;
              const wishlistCount = product.wishlistCount || 0;
              const ordersCount = product.ordersCount || 0;
              const rankLabel = `#${String(idx + 1).padStart(2, '0')}`;
              const isCopied = copiedProductId === product.id;

              return (
                <article
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectProduct(product);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="group flex flex-col bg-[#FAF9F6] border border-[#E7E5E4] rounded-lg overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:border-[#7C4D25] hover:shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C4D25]"
                >
                  <div className="relative aspect-[4/3] w-full bg-[#F2EFE9] overflow-hidden">
                    {imgFailed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#78716C] p-6 text-center">
                        <Armchair className="w-8 h-8 text-[#7C4D25]" />
                        <span className="text-xs font-medium">{title}</span>
                      </div>
                    ) : (
                      <img
                        src={product.imageUrl}
                        alt={title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    )}

                    {/* Clean Rank Index */}
                    <span className="absolute top-3 left-3 px-2 py-1 rounded bg-[#1C1917]/90 text-[#E5B748] font-mono text-[11px] font-semibold tabular-nums">
                      {rankLabel}
                    </span>

                    {/* Copy Single Product Link Only + Wishlist */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyProductLink(e, product.id)}
                        title={
                          lang === 'rw' ? 'Kopera Link y’iki gicuruzwa gusa' : 'Copy item link only'
                        }
                        aria-label="Copy product link only"
                        className="w-8 h-8 rounded-full bg-white/95 border border-[#E7E5E4] shadow-xs flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5 text-[#1C1917]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWishlist(product.id);
                        }}
                        aria-label={isWishlisted ? 'Saved in wishlist' : 'Save to wishlist'}
                        className="w-8 h-8 rounded-full bg-white/95 border border-[#E7E5E4] shadow-xs flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isWishlisted ? 'text-[#B91C1C] fill-[#B91C1C]' : 'text-[#57534E]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-white">
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-[#78716C] truncate">
                        {product.workshopName} · {product.location}
                      </p>
                      <h3 className="text-sm sm:text-base font-semibold text-[#1C1917] leading-snug line-clamp-2">
                        {title}
                      </h3>
                    </div>

                    {/* Real Market Demand Counters + Interactive Like Button */}
                    <div className="space-y-2.5 pt-2 border-t border-[#F2EFE9]">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-sm font-semibold text-[#1C1917] tabular-nums">
                          {formatRwf(product.priceRwf)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#57534E] font-mono tabular-nums">
                          <ShoppingBag className="w-3 h-3 text-[#7C4D25]" />
                          <span>
                            {ordersCount} {lang === 'rw' ? 'orders' : 'orders'}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLike(product.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            isLiked
                              ? 'bg-[#7C4D25] text-white border-[#7C4D25]'
                              : 'bg-[#FAF9F6] text-[#1C1917] border-[#D6D3D1] hover:border-[#7C4D25]'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : 'text-[#7C4D25]'}`} />
                          <span>{lang === 'rw' ? 'Kunda' : 'Like'}</span>
                          <span className="font-mono tabular-nums">({likesCount})</span>
                        </button>

                        <span className="text-[11px] font-mono tabular-nums text-[#78716C]">
                          {wishlistCount} {lang === 'rw' ? 'wishlist' : 'saved'}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
