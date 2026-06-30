import type { Locale } from './config';

// Self-contained localized strings for the homepage top navigation strips and
// the "Where to go in Santiago" block. Kept separate from the shared
// dictionaries (en.json / es.json) on purpose so this work does not collide with
// the parallel i18n chat's edits; the shape mirrors a dictionary namespace and
// can be folded into the main dictionaries later if desired.

export type NavItem = { label: string; href: string };

export type HomeNav = {
  whereToPrefix: string; // "Qué hacer en" / "Where to go in"
  city: string;
  featuredTitle: string;
  featuredCta: string;
  weekendCardTitle: string;
  pickDate: string; // aria-label for the date strip
  primaryAria: string; // aria-label for the light category strip
  secondaryAria: string; // aria-label for the dark topics strip
  moreLabel: string;
  primary: NavItem[]; // light strip — event categories
  secondary: NavItem[]; // dark strip — topics / lifestyle
  secondaryRight: NavItem[]; // dark strip — pushed to the right
};

const data: Record<Locale, HomeNav> = {
  es: {
    whereToPrefix: 'Qué hacer en',
    city: 'Santiago',
    featuredTitle: 'Destacados para los próximos días',
    featuredCta: 'Ver cartelera completa',
    weekendCardTitle: 'Dónde ir el fin de semana',
    pickDate: 'Elegir fecha',
    primaryAria: 'Categorías',
    secondaryAria: 'Temas',
    moreLabel: 'Más',
    primary: [
      { label: 'Exposiciones', href: '/events?category=performing-visual-arts' },
      { label: 'Stand-up', href: '/events?category=performing-visual-arts' },
      { label: 'Conciertos', href: '/events?category=music' },
      { label: 'Teatro', href: '/teatros' },
      { label: 'Entretenimiento', href: '/events' },
      { label: 'Talleres', href: '/events?category=lectures' },
      { label: 'Cine', href: '/events' },
      { label: 'Festivales', href: '/events?category=music' },
      { label: 'Excursiones', href: '/events' },
      { label: 'Danza', href: '/events?category=performing-visual-arts' },
    ],
    secondary: [
      { label: 'Comida', href: '/events?category=food-drink' },
      { label: 'Lugares interesantes', href: '/events' },
      { label: 'Niños', href: '/events' },
      { label: 'Afueras', href: '/events' },
      { label: 'Solo este invierno', href: '/events' },
    ],
    secondaryRight: [],
  },
  en: {
    whereToPrefix: 'Where to go in',
    city: 'Santiago',
    featuredTitle: 'Featured over the next few days',
    featuredCta: 'See full listings',
    weekendCardTitle: 'Where to go this weekend',
    pickDate: 'Pick a date',
    primaryAria: 'Categories',
    secondaryAria: 'Topics',
    moreLabel: 'More',
    primary: [
      { label: 'Exhibitions', href: '/events?category=performing-visual-arts' },
      { label: 'Stand-up', href: '/events?category=performing-visual-arts' },
      { label: 'Concerts', href: '/events?category=music' },
      { label: 'Theater', href: '/teatros' },
      { label: 'Entertainment', href: '/events' },
      { label: 'Workshops', href: '/events?category=lectures' },
      { label: 'Cinema', href: '/events' },
      { label: 'Festivals', href: '/events?category=music' },
      { label: 'Tours', href: '/events' },
      { label: 'Dance', href: '/events?category=performing-visual-arts' },
    ],
    secondary: [
      { label: 'Food', href: '/events?category=food-drink' },
      { label: 'Interesting places', href: '/events' },
      { label: 'Kids', href: '/events' },
      { label: 'Out of town', href: '/events' },
      { label: 'Only this winter', href: '/events' },
    ],
    secondaryRight: [],
  },
};

export function getHomeNav(locale: Locale): HomeNav {
  return data[locale] ?? data.es;
}

// Localized labels for the aggregator event-category slugs (src/lib/taxonomy.ts),
// used by the mosaic tag. Self-contained here for the same reason as the strings
// above — keep this work off the shared dictionaries.
const EVENT_CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    concierto: 'Concierto',
    festival: 'Festival',
    exposicion: 'Exposición',
    charla: 'Charla',
    'obra-de-teatro': 'Teatro',
    'evento-interactivo': 'Interactivo',
    otros: 'Otros',
  },
  en: {
    concierto: 'Concert',
    festival: 'Festival',
    exposicion: 'Exhibition',
    charla: 'Talk',
    'obra-de-teatro': 'Theater',
    'evento-interactivo': 'Interactive',
    otros: 'Other',
  },
};

export function eventCategoryLabel(locale: Locale, slug: string): string {
  return EVENT_CATEGORY_LABELS[locale]?.[slug] ?? EVENT_CATEGORY_LABELS.es[slug] ?? slug;
}
