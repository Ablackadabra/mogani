import { useEffect, useState } from 'react';
import { X, ShieldCheck, Upload, Eye, EyeOff } from 'lucide-react';
import { Language, PublicUser } from '../types';
import { adminLogin, identifyAccount, loginUser, registerUser } from '../api';
import { getCopy } from '../i18n';
import { BrandLogo } from './BrandLogo';
import { compressImageFile } from '../utils/image';

interface AuthModalProps {
  lang: Language;
  onClose: () => void;
  onSuccess: (token: string, user: PublicUser) => void;
}

export function AuthModal({ lang, onClose, onSuccess }: AuthModalProps) {
  const t = getCopy(lang);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+250 78');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [workshopName, setWorkshopName] = useState('');
  const [location, setLocation] = useState('Kigali, Rwanda');
  const [momoCode, setMomoCode] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  const [adminState, setAdminState] = useState({
    isAdminEmail: false,
    adminClaimed: true,
    envPasscodeConfigured: false,
  });
  const [adminEmailVerified, setAdminEmailVerified] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkVal = (mode === 'login' ? identifier : email).trim();
    if (!checkVal.includes('@')) {
      setAdminState((p) => (p.isAdminEmail ? { ...p, isAdminEmail: false } : p));
      setAdminEmailVerified(false);
      return;
    }
    const timer = setTimeout(() => {
      identifyAccount(checkVal)
        .then((res) => setAdminState(res))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [identifier, email, mode]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file, 420);
      setAvatarUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read avatar image.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        let isAdmin = adminState.isAdminEmail;
        if (!isAdmin && identifier.trim().includes('@')) {
          const check = await identifyAccount(identifier.trim());
          setAdminState(check);
          isAdmin = check.isAdminEmail;
        }
        if (isAdmin) {
          if (!adminEmailVerified) {
            setError(
              lang === 'rw'
                ? 'Email ya Administrator yamenyekanye. Emeza akazu ka Verify Administrator Email hasi ubone kwinjira.'
                : 'Administrator email detected. Check the Verify Administrator Email box below to continue.'
            );
            return;
          }
          const res = await adminLogin({
            email: identifier.trim(),
            password,
            emailVerified: adminEmailVerified,
          });
          onSuccess(res.token, res.user);
        } else {
          const res = await loginUser({ identifier: identifier.trim(), password });
          onSuccess(res.token, res.user);
        }
      } else {
        const res = await registerUser({
          name,
          email,
          phone,
          password,
          role,
          avatarUrl: avatarUrl || undefined,
          workshopName: role === 'seller' ? workshopName : undefined,
          location,
          momoCode: role === 'seller' ? momoCode : undefined,
          bankAccount: role === 'seller' ? bankAccount : undefined,
        });
        onSuccess(res.token, res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Account authentication"
    >
      <div className="w-full max-w-3xl bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl shadow-2xl overflow-hidden my-6 grid grid-cols-1 md:grid-cols-2">
        {/* Left 50%: Manufacturing Materials Backdrop & Brand Logo */}
        <div className="relative min-h-[200px] md:min-h-[480px] bg-[#1C1917] overflow-hidden">
          <img
            src="/src/assets/images/materials_craft_backdrop_1795441272104.jpg"
            alt="Craftsmanship materials: hardwood timber, linen, leather swatches, velvet, and brass joinery"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30 p-6 flex flex-col justify-between text-white">
            <div className="inline-block bg-white/95 px-3 py-2 rounded-lg self-start">
              <BrandLogo size="sm" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-medium leading-tight text-white">
                {lang === 'rw'
                  ? 'Kwinjira muri JOKEVE FURNITURE'
                  : 'JOKEVE FURNITURE Craft Portal'}
              </h2>
              <p className="text-xs text-[#E7E5E4] leading-relaxed">
                {lang === 'rw'
                  ? 'Gura intebe, garde-robe, utubati n’ibitanda, kodesha intebe za plastiki, kandi uganire n’umufundi mu mafoto n’amasaha.'
                  : 'Shop bespoke carpentry, wardrobes, cabinets, beds, or daily event rentals with photo chat and live courier tracking.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right 50%: Auth Form */}
        <div className="flex flex-col">
          <div className="px-6 py-4 bg-white border-b border-[#E7E5E4] flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-[#1C1917]">
              {mode === 'login' ? t.loginBtn : t.registerBtn}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 text-[#57534E] hover:text-[#1C1917] rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[80vh]">
            <div className="inline-flex w-full p-1 bg-[#F2EFE9] rounded-lg border border-[#E7E5E4]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {t.loginBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {t.registerBtn}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'login' ? (
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
                    className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('buyer')}
                      className={`py-2 px-3 rounded-md border text-xs font-medium cursor-pointer ${
                        role === 'buyer'
                          ? 'bg-[#1C1917] text-white border-[#1C1917]'
                          : 'bg-white text-[#57534E] border-[#D6D3D1]'
                      }`}
                    >
                      {lang === 'rw' ? 'Umuguzi (Buyer)' : 'Buyer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('seller')}
                      className={`py-2 px-3 rounded-md border text-xs font-medium cursor-pointer ${
                        role === 'seller'
                          ? 'bg-[#1C1917] text-white border-[#1C1917]'
                          : 'bg-white text-[#57534E] border-[#D6D3D1]'
                      }`}
                    >
                      {lang === 'rw' ? 'Umucuruzi (Seller)' : 'Seller / Workshop'}
                    </button>
                  </div>

                  {/* Optional Profile Avatar for Chat */}
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-[#E7E5E4]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile preview"
                        className="w-10 h-10 rounded-full object-cover border border-[#D6D3D1] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#F2EFE9] text-[#7C4D25] flex items-center justify-center text-xs font-semibold shrink-0">
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1C1917]">
                        {lang === 'rw' ? 'Ifoto yawe mu ruganiriro' : 'Chat Profile Photo (Optional)'}
                      </p>
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7C4D25] hover:underline cursor-pointer mt-0.5">
                        <Upload className="w-3 h-3" />
                        <span>{lang === 'rw' ? 'Hitamo ifoto' : 'Upload photo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAvatarUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#44403C] mb-1">
                      {lang === 'rw' ? 'Amazina Yose' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Aline Mukamana"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">
                        {t.payPhone}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#44403C] mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                    />
                  </div>

                  {role === 'seller' && (
                    <div className="space-y-3 p-3 rounded-lg bg-[#F2EFE9]/70 border border-[#E7E5E4]">
                      <div>
                        <label className="block text-xs font-medium text-[#44403C] mb-1">
                          Workshop / Shop Name
                        </label>
                        <input
                          type="text"
                          value={workshopName}
                          onChange={(e) => setWorkshopName(e.target.value)}
                          placeholder="Kigali Timber Studio"
                          className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-medium text-[#44403C] mb-1">
                            {t.payMomoCode}
                          </label>
                          <input
                            type="text"
                            value={momoCode}
                            onChange={(e) => setMomoCode(e.target.value)}
                            placeholder="*182*8*1*..."
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#44403C] mb-1">
                            {t.payBank}
                          </label>
                          <input
                            type="text"
                            value={bankAccount}
                            onChange={(e) => setBankAccount(e.target.value)}
                            placeholder="BK · 000..."
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D3D1] rounded-md text-[#1C1917]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">
                  {mode === 'login' &&
                  adminState.isAdminEmail &&
                  !adminState.adminClaimed &&
                  !adminState.envPasscodeConfigured
                    ? 'Set Admin Password (First-Time Claim)'
                    : t.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-20 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
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

              {mode === 'login' && adminState.isAdminEmail && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-300 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#7C4D25]" />
                    <span>{t.adminDetectedNote}</span>
                  </div>
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminEmailVerified}
                      onChange={(e) => setAdminEmailVerified(e.target.checked)}
                      className="rounded border-slate-400"
                    />
                    <span>Verify Administrator Email ({identifier.trim()})</span>
                  </label>
                </div>
              )}

              {error && (
                <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <p className="text-[11px] text-[#57534E]">
                {lang === 'rw'
                  ? 'Iyo winjiye, kuri iki gikoresho konti yawe ihita iguma ifunguye igihe cyose ugarutse paka wivanyemo.'
                  : 'Once signed in, your session stays logged in automatically on this device until you sign out.'}
              </p>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {busy
                  ? '...'
                  : mode === 'login'
                  ? adminState.isAdminEmail
                    ? 'Verify & Enter Admin Console'
                    : t.loginBtn
                  : t.registerBtn}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
