import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

const iconProps = {
  width: 38,
  height: 38,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Original line icons matching the reference category row, keyed by slug. */
function CategoryIcon({ slug }: { slug: string }) {
  switch (slug) {
    case 'music': // handheld microphone
      return (
        <svg {...iconProps}>
          <g transform="rotate(-38 12 12)">
            <rect x="10" y="2.5" width="4" height="9" rx="2" />
            <path d="M11 5h2M11 7h2M11 9h2" />
            <path d="M7.5 10.5a4.5 4.5 0 0 0 9 0" />
            <path d="M12 15v3.5M9.5 18.5h5" />
          </g>
        </svg>
      );
    case 'nightlife': // disco ball
      return (
        <svg {...iconProps}>
          <path d="M12 3v2.4" />
          <circle cx="12" cy="12.4" r="6.4" />
          <path d="M5.8 10.6h12.4M6.1 14.4h11.8M12 6v12.8" />
          <path d="M9.1 6.7C7.6 9.4 7.6 15.4 9.1 18.1M14.9 6.7c1.5 2.7 1.5 8.7 0 11.4" />
          <path d="M19.6 4.2l.45 1.2 1.2.45-1.2.45-.45 1.2-.45-1.2-1.2-.45 1.2-.45z" />
        </svg>
      );
    case 'performing-visual-arts': // two theatre masks
      return (
        <svg {...iconProps}>
          <path d="M3.5 5h7v3.8a3.5 3.5 0 0 1-7 0V5Z" />
          <circle cx="5.7" cy="7" r="0.5" />
          <circle cx="8.3" cy="7" r="0.5" />
          <path d="M5.6 8.8a1.6 1.6 0 0 0 2.8 0" />
          <path d="M13.5 9h7v3.8a3.5 3.5 0 0 1-7 0V9Z" />
          <circle cx="15.7" cy="11" r="0.5" />
          <circle cx="18.3" cy="11" r="0.5" />
          <path d="M15.6 13.4a1.6 1.6 0 0 1 2.8 0" />
        </svg>
      );
    case 'holidays': // calendar with a sun
      return (
        <svg {...iconProps}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9h17M8 3.5v3M16 3.5v3" />
          <circle cx="12" cy="14" r="2.1" />
          <path d="M12 10.6v.7M12 16.7v.7M8.4 14h.7M14.9 14h.7M9.6 11.6l.5.5M13.9 16.4l.5.5M14.4 11.6l-.5.5M10.1 16.4l-.5.5" />
        </svg>
      );
    case 'lectures': // graduation cap
      return (
        <svg {...iconProps}>
          <path d="M12 4 2.5 8.3 12 12.6l9.5-4.3L12 4Z" />
          <path d="M6.5 10.4V15c0 1.3 2.7 2.6 5.5 2.6s5.5-1.3 5.5-2.6v-4.6" />
          <path d="M21.5 8.3v4.4" />
          <circle cx="21.5" cy="13.4" r="0.7" />
        </svg>
      );
    case 'hobbies': // game controller
      return (
        <svg {...iconProps}>
          <path d="M8 8.5h8a5 5 0 0 1 5 5v.4a3.1 3.1 0 0 1-5.6 1.8l-.5-.7H9.1l-.5.7A3.1 3.1 0 0 1 3 14.3v-.4a5 5 0 0 1 5-5Z" />
          <path d="M6.5 11.8v2.4M5.3 13h2.4" />
          <circle cx="15.8" cy="12.2" r="0.8" />
          <circle cx="17.8" cy="14" r="0.8" />
        </svg>
      );
    case 'business': // presentation board on easel
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="16" height="11" rx="1.5" />
          <path d="M7 7.5h4.5M7 9.6h3" />
          <rect x="13.5" y="7.3" width="3.6" height="3.8" rx="0.6" />
          <path d="M12 15v3.2M8 20.5l4-2.3 4 2.3" />
        </svg>
      );
    case 'food-drink': // two cups
      return (
        <svg {...iconProps}>
          <path d="M4.6 8.6h7l-.7 9.8a1.5 1.5 0 0 1-1.5 1.4H6.8a1.5 1.5 0 0 1-1.5-1.4L4.6 8.6Z" />
          <path d="M4 8.6h8.2l.35-1.7H3.65L4 8.6Z" />
          <path d="M10 6.9 11.4 4" />
          <path d="M13.8 11h5.6l-.6 7.6a1.4 1.4 0 0 1-1.4 1.3h-1.6a1.4 1.4 0 0 1-1.4-1.3L13.8 11Z" />
          <path d="M14 13.6h5.2" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export function CategoryCircles() {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-3 sm:px-0 lg:justify-between">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/events?category=${cat.slug}`}
          className="group flex w-28 shrink-0 flex-col items-center gap-3 no-underline"
        >
          <span className="grid h-28 w-28 place-items-center rounded-full border border-ink/10 text-ink transition group-hover:border-coral group-hover:text-coral group-hover:shadow-card">
            <CategoryIcon slug={cat.slug} />
          </span>
          <span className="text-center text-sm font-medium leading-snug text-ink group-hover:text-coral">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
