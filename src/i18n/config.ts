import es from './dictionaries/es.json';
import en from './dictionaries/en.json';

// Add a new language by adding a code here + a matching dictionary file, and a
// label in localeNames. The language menu is driven by this list, so the UI
// scales automatically.
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

/** Cookie that stores the visitor's chosen language. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

// es is the source of truth for the shape; en must match it (TS enforces this).
export type Dictionary = typeof es;
const dictionaries: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
