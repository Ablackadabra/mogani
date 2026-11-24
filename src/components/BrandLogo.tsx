interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  darkText?: boolean;
}

export function JokeveMonogramSvg({
  className = 'w-9 h-9',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Matte Obsidian Rounded Square Backing matching JOKEVA emblem */}
      <rect width="100" height="100" rx="20" fill="#1B1A17" />

      {/* Outer broken gold ring (matches screenshot gap at ~10 o'clock and ~3:30) */}
      <path
        d="M 27 27 A 33 33 0 1 1 20 50"
        stroke="#E5B748"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 20.5 43 A 33 33 0 0 1 23 33"
        stroke="#E5B748"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Inner concentric gold ring connecting cleanly into the JK monogram */}
      <path
        d="M 52 24 A 26 26 0 1 1 24 52"
        stroke="#E5B748"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 24.5 44 A 26 26 0 0 1 46 24.5"
        stroke="#E5B748"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Left letter: J flowing gracefully from upper stem down into curve */}
      <path
        d="M 46 25 V 60 C 46 67 41 71 35 71 C 30 71 27 67.5 27 63"
        stroke="#E5B748"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right letter: K vertical stem + crisp geometric diagonals */}
      <path
        d="M 54 32 V 71"
        stroke="#E5B748"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <path
        d="M 70 38 L 54.5 52.5 L 71 67"
        stroke="#E5B748"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({
  size = 'md',
  showTagline = false,
  darkText = false,
}: BrandLogoProps) {
  const iconDims =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const titleClass =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
      ? 'text-2xl'
      : 'text-lg sm:text-xl';

  return (
    <span className="inline-flex items-center gap-3 shrink-0">
      <JokeveMonogramSvg className={iconDims} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display font-semibold tracking-tight whitespace-nowrap ${
            darkText ? 'text-white' : 'text-[#1C1917]'
          } ${titleClass}`}
        >
          JOKEVE FURNITURE
        </span>
        {showTagline && (
          <span className="text-[11px] font-medium text-[#7C4D25] mt-1 whitespace-nowrap">
            JOKEVE · Kigali Carpentry & Craft
          </span>
        )}
      </span>
    </span>
  );
}
