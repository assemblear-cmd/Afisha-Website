'use client';

import { useRouter } from 'next/navigation';
import { Card, Input, Select, Button } from '@/components/ui';
import { CATEGORIES } from '@/lib/categories';

interface SearchBarProps {
  defaultValues?: {
    query?: string;
    city?: string;
    date?: string;
    category?: string;
  };
}

export function SearchBar({ defaultValues = {} }: SearchBarProps) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams();

    const query = (data.get('query') as string | null)?.trim();
    const city = (data.get('city') as string | null)?.trim();
    const date = (data.get('date') as string | null)?.trim();
    const category = (data.get('category') as string | null)?.trim();

    if (query) params.set('query', query);
    if (city) params.set('city', city);
    if (date) params.set('date', date);
    if (category) params.set('category', category);

    router.push('/events' + (params.toString() ? '?' + params.toString() : ''));
  }

  return (
    <Card className="!overflow-visible p-2">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-2"
      >
        {/* What */}
        <div className="flex-[2] min-w-0">
          <label className="sr-only" htmlFor="sb-query">What</label>
          <Input
            id="sb-query"
            name="query"
            type="text"
            placeholder="Search events, artists, venues"
            defaultValue={defaultValues.query ?? ''}
          />
        </div>

        {/* Where */}
        <div className="flex-1 min-w-0">
          <label className="sr-only" htmlFor="sb-city">Where</label>
          <Input
            id="sb-city"
            name="city"
            type="text"
            placeholder="City"
            defaultValue={defaultValues.city ?? ''}
          />
        </div>

        {/* When */}
        <div className="flex-1 min-w-0">
          <label className="sr-only" htmlFor="sb-date">When</label>
          <Input
            id="sb-date"
            name="date"
            type="date"
            defaultValue={defaultValues.date ?? ''}
          />
        </div>

        {/* Category */}
        <div className="flex-1 min-w-0">
          <label className="sr-only" htmlFor="sb-category">Category</label>
          <Select
            id="sb-category"
            name="category"
            defaultValue={defaultValues.category ?? ''}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </Select>
        </div>

        <Button type="submit" variant="primary" className="shrink-0 whitespace-nowrap">
          🔎 Search
        </Button>
      </form>
    </Card>
  );
}
