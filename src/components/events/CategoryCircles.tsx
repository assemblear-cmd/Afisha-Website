import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

const iconProps = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Simple line icons (original) keyed by category slug. */
function CategoryIcon({ slug }: { slug: string }) {
  switch (slug) {
    case 'music':
      return (
        <svg {...iconProps}>
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      );
    case 'business':
      return (
        <svg {...iconProps}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 12h18" />
        </svg>
      );
    case 'food-drink':
      return (
        <svg {...iconProps}>
          <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10" />
          <path d="M16 3c-1.5 0-3 1.6-3 4s1.5 4 3 4v10" />
        </svg>
      );
    case 'arts':
      return (
        <svg {...iconProps}>
          <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.9 1.6-1.7 0-1.7 1.3-2.6 3-2.6h.9a2.5 2.5 0 0 0 0-5c-2 0-3.5-1.3-3.5-3C15.5 4.4 14.2 3 12 3Z" />
          <circle cx="7.5" cy="10.5" r="1" />
          <circle cx="12" cy="7.5" r="1" />
          <circle cx="16.5" cy="10.5" r="1" />
        </svg>
      );
    case 'tech':
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M2 20h20" />
        </svg>
      );
    case 'sports':
      return (
        <svg {...iconProps}>
          <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
          <path d="M17 5h3v1.5a3 3 0 0 1-3 3M7 5H4v1.5a3 3 0 0 0 3 3" />
          <path d="M12 13v4M8 21h8M10 21a2 2 0 0 1 4 0" />
        </svg>
      );
    case 'health':
      return (
        <svg {...iconProps}>
          <path d="M12 21s-7-4.5-9.3-9A4.8 4.8 0 0 1 12 6.5 4.8 4.8 0 0 1 21.3 12c-2.3 4.5-9.3 9-9.3 9Z" />
        </svg>
      );
    case 'community':
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8M21 20a6 6 0 0 0-4.7-5.85" />
        </svg>
      );
    case 'film':
      return (
        <svg {...iconProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9.5h18M7 5v14M17 5v14" />
        </svg>
      );
    case 'fashion':
      return (
        <svg {...iconProps}>
          <path d="M8 3 4 6l2 3 2-1v10h8V8l2 1 2-3-4-3-2.2 2a2 2 0 0 1-3.6 0L8 3Z" />
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
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-between sm:gap-6 sm:px-0">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/events?category=${cat.slug}`}
          className="group flex w-20 shrink-0 flex-col items-center gap-2 no-underline"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full border border-ink/15 text-ink transition group-hover:-translate-y-0.5 group-hover:border-coral group-hover:text-coral group-hover:shadow-card">
            <CategoryIcon slug={cat.slug} />
          </span>
          <span className="text-center text-xs font-medium leading-tight text-body group-hover:text-coral">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
