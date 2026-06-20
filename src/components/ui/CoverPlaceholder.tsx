import clsx from 'clsx';

// A curated set of on-brand duotone covers. One is picked deterministically from
// a stable seed (event id / theater name) so each tile keeps a distinct but
// consistent cover, instead of every card sharing the same coral→ink gradient.
// Hues stay in a controlled, brand-adjacent set rather than going rainbow.
const COVERS = [
  'from-[#F05537] to-[#2A0E4F]', // coral → ink (brand)
  'from-[#3EB489] to-[#10403B]', // teal → deep teal
  'from-[#6D5BD0] to-[#241046]', // violet → ink
  'from-[#F2A03D] to-[#9E2F22]', // amber → rust
  'from-[#2D9CDB] to-[#16324F]', // sky → navy
  'from-[#E0517E] to-[#3A1136]', // rose → plum
];

function seedIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

export interface CoverPlaceholderProps {
  /** Stable seed (event id or theater name) — fixes the cover per item. */
  seed: string;
  /** Watermark glyph carrying the subject: a category emoji or a monogram. */
  glyph?: string;
  className?: string;
}

/**
 * Decorative cover fallback shown behind (or instead of) a missing event image.
 * Purely presentational, hidden from assistive tech.
 */
export function CoverPlaceholder({ seed, glyph, className }: CoverPlaceholderProps) {
  const cover = COVERS[seedIndex(seed, COVERS.length)];
  return (
    <div
      aria-hidden
      className={clsx('absolute inset-0 overflow-hidden bg-gradient-to-br', cover, className)}
    >
      {/* soft top-left light keeps the fill from reading flat */}
      <div className="absolute -inset-1/4 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]" />
      {glyph && (
        <span className="absolute -bottom-5 -right-3 select-none text-[6rem] leading-none opacity-20 sm:text-[7rem]">
          {glyph}
        </span>
      )}
    </div>
  );
}
