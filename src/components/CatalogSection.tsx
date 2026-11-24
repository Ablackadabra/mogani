import { useState } from 'react';
import { Search, Armchair, Plus, Pencil, Heart, ThumbsUp } from 'lucide-react';
import { Language, Product, ProductCategory } from '../types';
import { getCopy } from '../i18n';
import { formatRwf } from '../utils/image';

interface CatalogSectionProps {
  lang: Language;
  products: Product[];
  loading: boolean;
  category: string;
  searchQuery: string;
  wishlistIds: string[];
  showWishlistOnly: boolean;
  onToggleWishlistOnly: () => void;
  onToggleWishlist: (productId: string) => void;
  onToggleLike?: (productId: string) => void;
  onCategoryChange: (cat: string) => void;
  onSearchChange: (q: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddProduct?: () => void;
  onEditProduct?: (product: Product) => void;
}

export function CatalogSection({
  lang,
  products,
  loading,
  category,
  searchQuery,
  wishlistIds,
  showWishlistOnly,
  onToggleWishlistOnly,
  onToggleWishlist,
  onToggleLike,
  onCategoryChange,
  onSearchChange,
  onSelectProduct,
  onAddProduct,
  onEditProduct,
}: CatalogSectionProps) {
  const t = getCopy(lang);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const categories: { id: 'all' | ProductCategory; label: string }[] = [
    { id: 'all', label: t.catAll },
    { id: 'sofas', label: t.catSofas },
    { id: 'dining', label: t.catDining },
    { id: 'wardrobes', label: t.catWardrobes },
    { id: 'beds', label: t.catBeds },
    { id: 'accent', label: t.catAccent },
    { id: 'office', label: t.catOffice },
    { id: 'rentals', label: t.catRentals },
  ];

  const categoryLabel = (cat: ProductCategory) => {
    switch (cat) {
      case 'sofas':
        return t.catSofas;
      case 'dining':
        return t.catDining;
      case 'wardrobes':
        return t.catWardrobes;
      case 'beds':
        return t.catBeds;
      case 'rentals':
        return t.catRentals;
      case 'accent':
        return t.catAccent;
      case 'office':
        return t.catOffice;
    }
  };

  return (
    <section id="catalog-section" className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E7E5E4]">
        <div className="space-y-2 max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#1C1917] [text-wrap:balance]">
            {t.catalogTitle}
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
            {t.catalogSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto shrink-0">
          <div className="relative flex-1 lg:w-72">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#7C4D25]"
            />
          </div>
          {onAddProduct && (
            <button
              type="button"
              onClick={onAddProduct}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'rw' ? 'Ongeraho' : 'Add Item'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs & Saved Wishlist Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-6">
        <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg border border-[#E7E5E4] overflow-x-auto max-w-full">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCategoryChange(c.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                category === c.id && !showWishlistOnly
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleWishlistOnly}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            showWishlistOnly
              ? 'bg-[#1C1917] text-white border-[#1C1917]'
              : 'bg-white text-[#1C1917] border-[#D6D3D1] hover:border-[#7C4D25]'
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              showWishlistOnly || wishlistIds.length > 0
                ? 'text-[#B91C1C] fill-[#B91C1C]'
                : 'text-[#7C4D25]'
            }`}
          />
          <span>
            {lang === 'rw' ? 'Ibikunzwe' : 'Wishlist'} ({wishlistIds.length})
          </span>
        </button>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-3 animate-pulse">
              <div className="aspect-[4/3] bg-[#ECE8E1] rounded-lg" />
              <div className="h-4 bg-[#ECE8E1] rounded w-1/2" />
              <div className="h-5 bg-[#ECE8E1] rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center border border-[#E7E5E4] rounded-lg bg-white">
          <p className="text-sm text-[#57534E]">{t.noProducts}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 pt-2">
          {products.map((product) => {
            const title = lang === 'rw' ? product.titleRw : product.title;
            const imgFailed = failedImages[product.id];
            const hasRental =
              (product.listingMode === 'rent' || product.listingMode === 'both') &&
              typeof product.rentalPricePerDayRwf === 'number' &&
              product.rentalPricePerDayRwf > 0;

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
                className="group flex flex-col bg-white border border-[#E7E5E4] rounded-lg overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C4D25]"
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
                      onError={() => setFailedImages((prev) => ({ ...prev, [product.id]: true }))}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(product.id);
                    }}
                    aria-label={
                      wishlistIds.includes(product.id) ? t.wishlistSaved : t.wishlistSave
                    }
                    title={wishlistIds.includes(product.id) ? t.wishlistSaved : t.wishlistSave}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-[#E7E5E4] shadow-xs flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        wishlistIds.includes(product.id)
                          ? 'text-[#B91C1C] fill-[#B91C1C]'
                          : 'text-[#57534E]'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#78716C] truncate">
                      <span>{categoryLabel(product.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{product.workshopName}</span>
                    </div>

                    <h3 className="text-base font-semibold text-[#1C1917] leading-snug line-clamp-2">
                      {title}
                    </h3>

                    <p className="text-xs text-[#57534E] truncate">
                      {product.material} · {product.dimensions}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#F2EFE9] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-[15px] font-medium text-[#1C1917] tabular-nums block">
                        {formatRwf(product.priceRwf)}
                      </span>
                      {hasRental && (
                        <span className="font-mono text-[11px] text-[#7C4D25] tabular-nums block">
                          {lang === 'rw' ? 'Kodesha:' : 'Rent:'}{' '}
                          {formatRwf(product.rentalPricePerDayRwf || 0)}/day
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {onToggleLike && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLike(product.id);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border cursor-pointer whitespace-nowrap ${
                            product.likedByViewer
                              ? 'bg-[#7C4D25] text-white border-[#7C4D25]'
                              : 'bg-[#FAF9F6] text-[#1C1917] border-[#D6D3D1] hover:border-[#7C4D25]'
                          }`}
                        >
                          <ThumbsUp className={`w-3 h-3 ${product.likedByViewer ? 'fill-white' : 'text-[#7C4D25]'}`} />
                          <span className="font-mono tabular-nums">{product.likesCount || 0}</span>
                        </button>
                      )}
                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProduct(product);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded hover:bg-[#E7E3DA] cursor-pointer whitespace-nowrap"
                        >
                          <Pencil className="w-3 h-3 text-[#7C4D25]" />
                          <span>{lang === 'rw' ? 'Hindura' : 'Edit'}</span>
                        </button>
                      )}
                      <span className="text-xs font-medium text-[#7C4D25] group-hover:underline underline-offset-4 whitespace-nowrap shrink-0">
                        {t.viewAndChat}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
