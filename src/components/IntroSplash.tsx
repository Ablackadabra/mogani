import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CheckCircle2, Globe, UserCheck } from 'lucide-react';
import { Language, PublicUser } from '../types';
import { LANGUAGES } from '../i18n';

interface IntroSplashProps {
  lang: Language;
  user?: PublicUser | null;
  onChangeLang: (lang: Language) => void;
  onComplete: () => void;
}

export function IntroSplash({ lang, user, onChangeLang, onComplete }: IntroSplashProps) {
  const prefersReduced = useReducedMotion();
  const [confirmed, setConfirmed] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleConfirmEnter = () => {
    if (!confirmed || exiting) return;
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 480);
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.03 : 1 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-[#12110F] text-white flex flex-col items-center justify-center overflow-y-auto py-8 px-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="JOKEVE FURNITURE welcome animation"
    >
      {/* Atmospheric Craft Backdrop Slow Cinema Zoom */}
      <motion.div
        initial={{ scale: 1.12, opacity: 0 }}
        animate={{ scale: prefersReduced ? 1.02 : 1, opacity: 0.24 }}
        transition={{ duration: 3.4, ease: 'easeOut' }}
        className="absolute inset-0 pointer-events-none"
      >
        <img
          src="/src/assets/images/hero_living_room_1795425660795.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Dark radial contrast scrim + warm gold spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(229,183,72,0.16) 0%, rgba(18,17,15,0.88) 46%, rgba(12,11,9,0.98) 100%)',
        }}
      />

      {/* Language Selector on Entry Confirmation Screen */}
      <div className="relative z-10 w-full max-w-xl flex justify-end mb-4">
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-medium text-white backdrop-blur-xs hover:border-[#E5B748]/60 transition-colors cursor-pointer">
          <Globe className="w-3.5 h-3.5 text-[#E5B748] shrink-0" />
          <select
            aria-label="Choose language"
            value={lang}
            onChange={(e) => onChangeLang(e.target.value as Language)}
            className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#1C1917] text-white">
                {l.native} ({l.label})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Center Animated Emblem, Title & Explicit Entry Confirmation */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl">
        {/* Animated JOKEVE Gold Monogram Emblem */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl shadow-2xl border border-[#E5B748]/25 overflow-hidden bg-[#1B1A17]"
        >
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            aria-hidden="true"
          >
            <rect width="100" height="100" rx="20" fill="#1B1A17" />

            {/* Outer concentric gold ring animating pathLength 0 -> 1 */}
            <motion.path
              d="M 27 27 A 33 33 0 1 1 20 50"
              stroke="#E5B748"
              strokeWidth="3.2"
              strokeLinecap="round"
              initial={{ pathLength: prefersReduced ? 1 : 0, opacity: 0.3 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.15, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.path
              d="M 20.5 43 A 33 33 0 0 1 23 33"
              stroke="#E5B748"
              strokeWidth="3.2"
              strokeLinecap="round"
              initial={{ pathLength: prefersReduced ? 1 : 0, opacity: 0.3 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Inner concentric gold ring */}
            <motion.path
              d="M 52 24 A 26 26 0 1 1 24 52"
              stroke="#E5B748"
              strokeWidth="2.8"
              strokeLinecap="round"
              initial={{ pathLength: prefersReduced ? 1 : 0, opacity: 0.25 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.05, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.path
              d="M 24.5 44 A 26 26 0 0 1 46 24.5"
              stroke="#E5B748"
              strokeWidth="2.8"
              strokeLinecap="round"
              initial={{ pathLength: prefersReduced ? 1 : 0, opacity: 0.25 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Interlocking J stroke draw */}
            <motion.path
              d="M 46 25 V 60 C 46 67 41 71 35 71 C 30 71 27 67.5 27 63"
              stroke="#E5B748"
              strokeWidth="3.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Interlocking K stem + arms draw */}
            <motion.path
              d="M 54 32 V 71"
              stroke="#E5B748"
              strokeWidth="3.1"
              strokeLinecap="round"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.65, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.path
              d="M 70 38 L 54.5 52.5 L 71 67"
              stroke="#E5B748"
              strokeWidth="3.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.75, delay: 1.25, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          {/* Repeating golden light sweep while waiting for visitor confirmation */}
          {!prefersReduced && (
            <motion.div
              initial={{ x: '-140%' }}
              animate={{ x: '160%' }}
              transition={{
                duration: 1.2,
                delay: 1.65,
                repeat: Infinity,
                repeatDelay: 2.6,
                ease: 'easeInOut',
              }}
              className="absolute inset-y-0 w-16 pointer-events-none"
              style={{
                background:
                  'linear-gradient(105deg, transparent 0%, rgba(229,183,72,0.28) 50%, transparent 100%)',
              }}
            />
          )}
        </motion.div>

        {/* Title & Subtitle Sequence */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 space-y-2"
        >
          <p className="text-xs tracking-[0.28em] font-medium text-[#E5B748]">
            JOKEVE
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-white">
            JOKEVE FURNITURE
          </h1>
          <p className="text-xs sm:text-sm text-[#D6D3D1] max-w-md mx-auto pt-1 leading-relaxed">
            {lang === 'rw'
              ? 'Kigali Atelier · Kugura, Gukora, Gukodesha no Gusana Intebe & Ibikoresho byo mu Giti'
              : 'Kigali Atelier · Fine Woodwork, Custom Commands, Event Rentals & Chair Restoration'}
          </p>
        </motion.div>

        {/* Playback Timeline Progress Bar */}
        <div className="w-56 h-0.5 bg-white/15 rounded-full overflow-hidden mt-7">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: prefersReduced ? 1.0 : 2.3,
              ease: 'easeOut',
            }}
            style={{ transformOrigin: '0% 50%' }}
            className="h-full bg-[#E5B748]"
          />
        </div>

        {/* Manual Confirmation Gate — Never Auto-Enters Without User Confirmation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReduced ? 0.2 : 1.75, duration: 0.5 }}
          className="mt-7 flex flex-col items-center gap-4 w-full max-w-sm bg-white/5 border border-white/15 rounded-xl p-4 backdrop-blur-xs"
        >
          {user && (
            <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#E5B748]/15 border border-[#E5B748]/35 text-left text-xs text-[#F5EFE0]">
              <UserCheck className="w-4 h-4 text-[#E5B748] shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {lang === 'rw' ? `Konti yawe irafunguye: ${user.name}` : `Signed in as ${user.name}`}
                </p>
                <p className="text-[11px] text-[#E5B748]/90 truncate">
                  {lang === 'rw'
                    ? 'Uzahita ukomeza muri konti yawe kuri iki gikoresho'
                    : 'Your session stays active on this device'}
                </p>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2.5 text-left text-xs text-[#E7E5E4] cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/40 accent-[#E5B748] cursor-pointer shrink-0"
            />
            <span>
              {lang === 'rw'
                ? 'Nemeje ku giti cyanjye ko ngiye kwinjira ku rubuga rwa JOKEVE FURNITURE.'
                : 'I confirm that I want to enter the JOKEVE FURNITURE platform.'}
            </span>
          </label>

          <button
            type="button"
            disabled={!confirmed || exiting}
            onClick={handleConfirmEnter}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#12110F] bg-[#E5B748] rounded-md hover:bg-[#F0C965] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {lang === 'rw' ? 'Emeza & Injira kuri Website' : 'Confirm & Enter Website'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
