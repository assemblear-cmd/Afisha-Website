import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

interface CategoryFilterProps {
  active?: string;
}

export function CategoryFilter({ active }: CategoryFilterProps) {
  const baseChip =
    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors';
  const activeChip = 'bg-coral text-white';
  const inactiveChip = 'bg-surface text-body hover:bg-ink/5';

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
      <div className="flex gap-2 pb-1">
        {/* All chip */}
        <Link
          href="/events"
          className={`${baseChip} ${!active ? activeChip : inactiveChip}`}
        >
          ✨ All
        </Link>

        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/events?category=${cat.slug}`}
            className={`${baseChip} ${active === cat.slug ? activeChip : inactiveChip}`}
          >
            {cat.emoji} {cat.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
