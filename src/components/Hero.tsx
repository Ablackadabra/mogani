import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Wrench,
  ShoppingBag,
  Store,
  SlidersHorizontal,
  Globe,
  ShieldCheck,
  CalendarClock,
  Eye,
  EyeOff,
  LogOut,
  MessageSquare,
  Package,
} from 'lucide-react';
import { Language, PublicUser } from '../types';
import { getCopy, LANGUAGES } from '../i18n';
import { adminLogin, identifyAccount, loginUser } from '../api';
import { BrandLogo } from './BrandLogo';

interface HeroProps {
  lang: Language;
  user: PublicUser | null;
  onChangeLang: (lang: Language) => void;
  onBrowseCatalog: () => void;
  onOpenRentals: () => void;
  onOpenSell: () => void;
  onOpenRepair: () => void;
  onOpenMessages?: () => void;
  onOpenOrders?: () => void;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
  onOpenAuthModal: () => void;
  onAuthSuccess: (token: string, user: PublicUser) => void;
}

export function Hero({
  lang,
  user,
  onChangeLang,
  onBrowseCatalog,
  onOpenRentals,
  onOpenSell,
  onOpenRepair,
  onOpenMessages,
  onOpenOrders,
  onOpenAdmin,
  onLogout,
  onOpenAuthModal,
  onAuthSuccess,
}: HeroProps) {
  const t = getCopy(lang);

  // Inline Login Table state (Phone/Email + Password + automatic Admin Email detection)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminState, setAdminState] = useState<{
    isAdminEmail: boolean;
    adminClaimed: boolean;
    envPasscodeConfigured: boolean;
  }>({
    isAdminEmail: false,
    adminClaimed: true,
    envPasscodeConfigured: false,
  });
  const [adminEmailVerified, setAdminEmailVerified] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const trimmed = identifier.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setAdminState((prev) => (prev.isAdminEmail ? { ...prev, isAdminEmail: false } : prev));
      setAdminEmailVerified(false);
      return;
    }
    const timer = setTimeout(() => {
      identifyAccount(trimmed)
        .then((res) => setAdminState(res))
        .catch(() => {});
    }, 220);
    return () => clearTimeout(timer);
  }, [identifier]);

  async function handleInlineLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      if (adminState.isAdminEmail) {
        const res = await adminLogin({
          email: identifier.trim(),
          password,
          emailVerified: adminEmailVerified,
        });
        onAuthSuccess(res.token, res.user);
      } else {
        const res = await loginUser({ identifier: identifier.trim(), password });
        onAuthSuccess(res.token, res.user);
      }
      setIdentifier('');
      setPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoginBusy(false);
    }
  }

  return (
    <section className="border-b border-[#E7E5E4] bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-12 lg:pt-10 lg:pb-14 space-y-8">
        {/* Distinct Enterprise Brand Entrance & International Language Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E7E5E4]">
          <div className="flex flex-wrap items-center gap-4">
            <BrandLogo size="lg" showTagline />
            <span className="hidden sm:inline text-xs text-[#78716C]">· Kigali, Rwanda</span>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#1C1917] bg-white border border-[#D6D3D1] rounded-md px-3 py-1.5">
            <Globe className="w-3.5 h-3.5 text-[#7C4D25] shrink-0" />
            <select
              aria-label="Select international language"
              value={lang}
              onChange={(e) => onChangeLang(e.target.value as Language)}
              className="bg-transparent text-xs font-medium text-[#1C1917] focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.label})
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Top 5 Action Boxes (Buy · Sell · Command Online · Repair · Rent Chairs) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="group p-4 sm:p-5 bg-white border border-[#E7E5E4] rounded-lg text-left hover:border-[#7C4D25] hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 text-[#7C4D25] mb-3" />
            <h2 className="text-sm font-semibold text-[#1C1917] group-hover:text-[#7C4D25]">
              {t.hubBuyTitle}
            </h2>
            <p className="text-xs text-[#57534E] mt-1 leading-relaxed">{t.hubBuyDesc}</p>
          </button>

          <button
            type="button"
            onClick={onOpenSell}
            className="group p-4 sm:p-5 bg-white border border-[#E7E5E4] rounded-lg text-left hover:border-[#7C4D25] hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Store className="w-5 h-5 text-[#7C4D25] mb-3" />
            <h2 className="text-sm font-semibold text-[#1C1917] group-hover:text-[#7C4D25]">
              {t.hubSellTitle}
            </h2>
            <p className="text-xs text-[#57534E] mt-1 leading-relaxed">{t.hubSellDesc}</p>
          </button>

          <button
            type="button"
            onClick={onBrowseCatalog}
            className="group p-4 sm:p-5 bg-white border border-[#E7E5E4] rounded-lg text-left hover:border-[#7C4D25] hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-5 h-5 text-[#7C4D25] mb-3" />
            <h2 className="text-sm font-semibold text-[#1C1917] group-hover:text-[#7C4D25]">
              {t.hubCommandTitle}
            </h2>
            <p className="text-xs text-[#57534E] mt-1 leading-relaxed">{t.hubCommandDesc}</p>
          </button>

          <button
            type="button"
            onClick={onOpenRepair}
            className="group p-4 sm:p-5 bg-white border border-[#E7E5E4] rounded-lg text-left hover:border-[#7C4D25] hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Wrench className="w-5 h-5 text-[#7C4D25] mb-3" />
            <h2 className="text-sm font-semibold text-[#1C1917] group-hover:text-[#7C4D25]">
              {t.hubRepairTitle}
            </h2>
            <p className="text-xs text-[#57534E] mt-1 leading-relaxed">{t.hubRepairDesc}</p>
          </button>

          <button
            type="button"
            onClick={onOpenRentals}
            className="col-span-2 lg:col-span-1 group p-4 sm:p-5 bg-white border border-[#E7E5E4] rounded-lg text-left hover:border-[#7C4D25] hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <CalendarClock className="w-5 h-5 text-[#7C4D25] mb-3" />
            <h2 className="text-sm font-semibold text-[#1C1917] group-hover:text-[#7C4D25]">
              {t.hubRentTitle}
            </h2>
            <p className="text-xs text-[#57534E] mt-1 leading-relaxed">{t.hubRentDesc}</p>
          </button>
        </div>

        {/* 2-Column Split Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <h1 className="font-display text-[clamp(1.9rem,3.3vw,3rem)] leading-[1.12] font-medium tracking-tight text-[#1C1917] [text-wrap:balance]">
                {t.heroTitle}
              </h1>
              <p className="text-sm sm:text-base leading-relaxed text-[#57534E] max-w-prose">
                {t.heroLead}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t.heroPrimaryCta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenRepair}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-[#7C4D25]" />
                <span>{t.heroSecondaryCta}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative w-full h-full min-h-[260px] lg:min-h-[360px] rounded-xl overflow-hidden bg-[#ECE8E1] border border-[#E7E5E4] shadow-sm">
              <img
                src="/src/assets/images/hero_living_room_1795425660795.jpg"
                alt="Handcrafted walnut sofa and solid wood coffee table in a sunlit living room"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 flex items-end justify-between gap-4 text-white">
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-[#E5B748]">
                    JOKEVE ATELIER · KIGALI
                  </p>
                  <p className="text-xs sm:text-sm text-white/95 font-medium mt-0.5">
                    {lang === 'rw'
                      ? 'Ibikoresho by’igiti cy’umwimerere bikozwe mu buhanga'
                      : 'Solid hardwood joinery, custom finishes & direct delivery'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Signed-In Member Bar OR Dedicated 50/50 Login Table */}
        {user ? (
          <div className="bg-white border border-[#E7E5E4] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-11 h-11 rounded-full object-cover border border-[#D6D3D1] shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#1C1917] text-[#E5B748] flex items-center justify-center text-sm font-semibold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1C1917] truncate">
                  {lang === 'rw' ? `Murakaza neza, ${user.name}` : `Welcome back, ${user.name}`}
                </p>
                <p className="text-xs text-[#57534E] truncate">
                  {user.workshopName ? `${user.workshopName} · ` : ''}
                  {user.role === 'admin'
                    ? lang === 'rw'
                      ? 'Umuyobozi (Admin) · Winjiye kuri iki gikoresho'
                      : 'Administrator · Signed in on this device'
                    : lang === 'rw'
                    ? 'Konti yawe izaguma ifunguye kuri iki gikoresho'
                    : 'Your account stays signed in on this device'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {user.role === 'admin' && onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1C1917] rounded-md hover:bg-[#332E2A] cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E5B748]" />
                  <span>{t.navAdmin}</span>
                </button>
              )}
              {onOpenMessages && (
                <button
                  type="button"
                  onClick={onOpenMessages}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.navMessages}</span>
                </button>
              )}
              {onOpenOrders && (
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] cursor-pointer whitespace-nowrap"
                >
                  <Package className="w-3.5 h-3.5 text-[#7C4D25]" />
                  <span>{t.ordersBtn}</span>
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#57534E] border border-[#E7E5E4] rounded-md hover:text-[#1C1917] hover:bg-stone-100 cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'rw' ? 'Sohoka' : 'Sign Out'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 bg-white border border-[#E7E5E4] rounded-xl overflow-hidden">
            {/* Left Half: Manufacturing Materials Craft Backdrop */}
            <div className="relative min-h-[220px] lg:min-h-[270px] bg-[#1C1917] overflow-hidden">
              <img
                src="/src/assets/images/materials_craft_backdrop_1795441272104.jpg"
                alt="Solid walnut timber, upholstery linen, saddle leather swatches, velvet, and solid brass hardware"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15 p-6 flex flex-col justify-between text-white">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#E5B748]">
                  <span>JOKEVE FURNITURE · Materials & Joinery</span>
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-display text-xl font-medium text-white">
                    {lang === 'rw'
                      ? 'Ibikoresho by’Umwimerere mu Kubaza no Gukora Intebe'
                      : 'Raw Timber, Linen, Velvet, Leather & Solid Brass'}
                  </h2>
                  <p className="text-xs text-[#E7E5E4] leading-relaxed max-w-md">
                    {lang === 'rw'
                      ? 'Injira kugira ngo ubone ibicuruzwa, ugure cyangwa ukodeshe intebe, uganire n’abafundi, kandi ukurikirane aho igicuruzwa kigeze.'
                      : 'Sign in to commission bespoke woodwork, rent chairs, negotiate directly with artisans, and track live deliveries.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Half: Phone/Email + Password Login Table */}
            <div className="p-6 flex flex-col justify-center space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#1C1917]">{t.loginTableTitle}</h2>
                  <p className="text-xs text-[#57534E] mt-0.5 leading-relaxed">
                    {t.loginTableSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="text-xs font-medium text-[#7C4D25] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.registerBtn}
                </button>
              </div>

              <form onSubmit={handleInlineLogin} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#44403C] mb-1">
                      {t.identifierLabel}
                    </label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="+250 788... / email@example.com"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#44403C] mb-1">
                      {adminState.isAdminEmail &&
                      !adminState.adminClaimed &&
                      !adminState.envPasscodeConfigured
                        ? 'Set Admin Password (First-Time)'
                        : t.passwordLabel}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-20 py-2 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#57534E] hover:text-[#1C1917] rounded cursor-pointer"
                      >
                        {showPassword ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Show</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {adminState.isAdminEmail && (
                  <div className="p-3 rounded-md bg-[#F8FAFC] border border-slate-300 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#7C4D25] mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900">{t.adminDetectedNote}</p>
                        <p className="text-slate-600 mt-0.5">
                          {!adminState.adminClaimed && !adminState.envPasscodeConfigured
                            ? 'First-time verification: confirm your email and choose your administrator password.'
                            : 'Confirm your verified administrator email below before entering.'}
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 font-medium text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adminEmailVerified}
                        onChange={(e) => setAdminEmailVerified(e.target.checked)}
                        className="rounded border-slate-400 text-[#7C4D25]"
                      />
                      <span>Verify Admin Email ({identifier.trim()})</span>
                    </label>
                  </div>
                )}

                {loginError && (
                  <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-md">
                    {loginError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loginBusy || (adminState.isAdminEmail && !adminEmailVerified)}
                    className="flex-1 py-2.5 px-5 text-xs font-medium text-white bg-[#1C1917] rounded-md hover:bg-[#332E2A] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {loginBusy
                      ? '...'
                      : adminState.isAdminEmail
                      ? 'Verify & Enter Admin Console'
                      : t.loginBtn}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="py-2.5 px-4 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {t.registerBtn}
                  </button>
                </div>
                <p className="text-[11px] text-[#57534E]">
                  {lang === 'rw'
                    ? 'Iyo winjiye kuri iki gikoresho, konti yawe ihita iguma ifunguye paka wivanyemo.'
                    : 'Signing in keeps your account logged in automatically on this device.'}
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
