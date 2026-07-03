// Money helpers for the organizer/commerce module. Amounts are stored in
// currency minor units: whole pesos for CLP (zero-decimal), cents for USD
// (legacy demo data). Internal ledger tokens are 1 token = 1 CLP.

const ZERO_DECIMAL_CURRENCIES = new Set(['CLP', 'JPY', 'KRW', 'VND']);

export function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
}

export function minorUnitsToAmount(minor: number, currency: string): number {
  return isZeroDecimal(currency) ? minor : minor / 100;
}

export function formatMoney(minor: number, currency = 'CLP'): string {
  const upper = currency.toUpperCase();
  const locale = upper === 'CLP' ? 'es-CL' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: upper,
    maximumFractionDigits: isZeroDecimal(upper) ? 0 : 2,
  }).format(minorUnitsToAmount(minor, upper));
}

/** Ticket-price display: 0 renders as "Free". */
export function formatTicketPrice(minor: number, currency = 'CLP'): string {
  if (minor <= 0) return 'Free';
  return formatMoney(minor, currency);
}
