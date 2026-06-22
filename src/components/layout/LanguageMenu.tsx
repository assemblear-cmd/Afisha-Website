'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { locales, localeNames, LOCALE_COOKIE, type Locale } from '@/i18n/config';

// Language picker shown in the header. Writes the chosen locale to a cookie and
// refreshes so the Server Components re-render with the new dictionary. Driven
// by the `locales` list, so adding a language needs no change here.
export function LanguageMenu({ current }: { current: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function choose(loc: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${loc}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Idioma / Language"
        className="flex items-center gap-1 text-sm font-medium text-body no-underline hover:text-coral"
      >
        <span aria-hidden>🌐</span>
        {current.toUpperCase()}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Idioma / Language"
          className="absolute right-0 z-50 mt-2 min-w-[8rem] rounded-lg border border-ink/10 bg-white py-1 shadow-card"
        >
          {locales.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                role="option"
                aria-selected={loc === current}
                onClick={() => choose(loc)}
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-surface ${
                  loc === current ? 'font-semibold text-coral' : 'text-body'
                }`}
              >
                {localeNames[loc]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
