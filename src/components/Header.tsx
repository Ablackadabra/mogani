import { useState } from 'react';
import { Check, Heart, Link2 } from 'lucide-react';
import { Language, PublicUser } from '../types';
import { getCopy } from '../i18n';
import { BrandLogo } from './BrandLogo';

export type ActiveView = 'collection' | 'trending' | 'repair' | 'map' | 'messages' | 'sell' | 'admin';

interface HeaderProps {
  lang: Language;
  activeView: ActiveView;
  user: PublicUser | null;
  wishlistCount: number;
  onNavigate: (view: ActiveView, anchor?: string) => void;
  onOpenAuth: () => void;
  onOpenOrders: () => void;
  onOpenWishlist: () => void;
}

export function Header({
  lang,
  activeView,
  user,
  wishlistCount,
  onNavigate,
  onOpenAuth,
  onOpenOrders,
  onOpenWishlist,
}: HeaderProps) {
  const t = getCopy(lang);
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleCopyAppLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E7E5E4]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        {/* Zone 1: Company Brand Logo */}
        <button
          type="button"
          onClick={() => onNavigate('collection')}
          className="shrink-0 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C4D25]"
        >
          <BrandLogo size="sm" />
        </button>

        {/* Zone 2: Concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57534E]">
          <button
            type="button"
            onClick={() => onNavigate('trending')}
            className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b transition-colors duration-150 ${
              activeView === 'trending'
                ? 'text-[#1C1917] border-[#7C4D25]'
                : 'border-transparent hover:text-[#1C1917] hover:border-[#D6D3D1]'
            }`}
          >
            {lang === 'rw' ? 'Bikunzwe' : 'Most Loved'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('collection', 'catalog-section')}
            className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b transition-colors duration-150 ${
              activeView === 'collection'
                ? 'text-[#1C1917] border-[#7C4D25]'
                : 'border-transparent hover:text-[#1C1917] hover:border-[#D6D3D1]'
            }`}
          >
            {t.navCollection}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('repair')}
            className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b transition-colors duration-150 ${
              activeView === 'repair'
                ? 'text-[#1C1917] border-[#7C4D25]'
                : 'border-transparent hover:text-[#1C1917] hover:border-[#D6D3D1]'
            }`}
          >
            {t.navRepair}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b transition-colors duration-150 ${
              activeView === 'map'
                ? 'text-[#1C1917] border-[#7C4D25]'
                : 'border-transparent hover:text-[#1C1917] hover:border-[#D6D3D1]'
            }`}
          >
            {t.navMap}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('messages')}
            className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b transition-colors duration-150 ${
              activeView === 'messages'
                ? 'text-[#1C1917] border-[#7C4D25]'
                : 'border-transparent hover:text-[#1C1917] hover:border-[#D6D3D1]'
            }`}
          >
            {t.navMessages}
          </button>
          {user?.role === 'admin' ? (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b transition-colors duration-150 ${
                activeView === 'admin'
                  ? 'text-[#1C1917] border-[#7C4D25]'
                  : 'border-transparent hover:text-[#1C1917] hover:border-[#D6D3D1]'
              }`}
            >
              {t.navAdmin}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('sell')}
              className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b transition-colors duration-150 ${
                activeView === 'sell'
                  ? 'text-[#1C1917] border-[#7C4D25]'
                  : 'border-transparent hover:text-[#1C1917] hover:border-[#D6D3D1]'
              }`}
            >
              {t.navSell}
            </button>
          )}
        </nav>

        {/* Zone 3: Copy Link Only, Wishlist & Primary Account Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyAppLink}
            title={lang === 'rw' ? 'Kopera Link y’urubuga gusa' : 'Copy storefront link only'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1C1917] bg-white border border-[#D6D3D1] rounded-md hover:border-[#7C4D25] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {linkCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            ) : (
              <Link2 className="w-3.5 h-3.5 text-[#7C4D25] shrink-0" />
            )}
            <span className="hidden sm:inline">
              {linkCopied
                ? lang === 'rw'
                  ? 'Yakopererwe'
                  : 'Copied'
                : lang === 'rw'
                ? 'Kopera Link'
                : 'Copy Link'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label={`Open wishlist (${wishlistCount})`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1C1917] bg-white border border-[#D6D3D1] rounded-md hover:border-[#7C4D25] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Heart
              className={`w-3.5 h-3.5 shrink-0 ${
                wishlistCount > 0 ? 'text-[#B91C1C] fill-[#B91C1C]' : 'text-[#7C4D25]'
              }`}
            />
            <span className="hidden sm:inline">Wishlist</span>
            <span className="font-mono tabular-nums text-[11px] text-[#57534E]">
              {wishlistCount}
            </span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={user.role === 'admin' && activeView !== 'admin' ? () => onNavigate('admin') : onOpenOrders}
              className="px-4 py-2 text-xs font-medium text-white bg-[#1C1917] rounded-md hover:bg-[#332E2A] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C4D25]"
            >
              <span className="inline-block max-w-[150px] truncate align-bottom">
                {user.role === 'admin'
                  ? `${t.navAdmin} · ${user.email.split('@')[0]}`
                  : `${user.name.split(' ')[0]} · ${t.ordersBtn}`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C4D25]"
            >
              {t.signIn}
            </button>
          )}
        </div>
      </div>

      {/* Mobile compact nav row */}
      <div className="md:hidden border-t border-[#E7E5E4] px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto text-xs font-medium text-[#57534E]">
        <button
          type="button"
          onClick={() => onNavigate('trending')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeView === 'trending' ? 'text-[#1C1917] underline underline-offset-4' : ''}`}
        >
          {lang === 'rw' ? 'Bikunzwe' : 'Most Loved'}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('collection', 'catalog-section')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeView === 'collection' ? 'text-[#1C1917] underline underline-offset-4' : ''}`}
        >
          {t.navCollection}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('repair')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeView === 'repair' ? 'text-[#1C1917] underline underline-offset-4' : ''}`}
        >
          {t.navRepair}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeView === 'map' ? 'text-[#1C1917] underline underline-offset-4' : ''}`}
        >
          {t.navMap}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('messages')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeView === 'messages' ? 'text-[#1C1917] underline underline-offset-4' : ''}`}
        >
          {t.navMessages}
        </button>
        {user?.role === 'admin' ? (
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`whitespace-nowrap shrink-0 py-1 ${activeView === 'admin' ? 'text-[#1C1917] underline underline-offset-4' : ''}`}
          >
            {t.navAdmin}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('sell')}
            className={`whitespace-nowrap shrink-0 py-1 ${activeView === 'sell' ? 'text-[#1C1917] underline underline-offset-4' : ''}`}
          >
            {t.navSell}
          </button>
        )}
      </div>
    </header>
  );
}
