import { z } from 'zod';
import { coverImageSchema } from '@/lib/cover-image';

export const ROLES = ['visitor', 'organizer'] as const;

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLES).default('visitor'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ticketTypeInputSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1),
});

export const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(1),
  venue: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  coverImage: coverImageSchema,
  ticketTypes: z.array(ticketTypeInputSchema).min(1),
});

export function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s/g, '');
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isValidCardNumber(num: string): boolean {
  const digits = num.replace(/\s/g, '');
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length < 13 || digits.length > 19) return false;
  return luhnCheck(digits);
}

export function isValidExpiry(mmYY: string): boolean {
  const match = mmYY.match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  // End of the expiry month (last millisecond) must be >= now.
  const endOfMonth = new Date(year, month, 1).getTime() - 1;
  return endOfMonth >= Date.now();
}

export function isValidCvc(cvc: string): boolean {
  return /^\d{3,4}$/.test(cvc);
}

export const cardSchema = z.object({
  number: z.string().refine(isValidCardNumber, 'Enter a valid card number'),
  name: z.string().min(2, 'Enter the name on the card'),
  expiry: z.string().refine(isValidExpiry, 'Enter a valid future expiry (MM/YY)'),
  cvc: z.string().refine(isValidCvc, 'Enter a valid CVC'),
});

export const checkoutSchema = z.object({
  buyerName: z.string().min(2),
  buyerEmail: z.string().email(),
  card: cardSchema,
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.coerce.number().int().min(0),
      })
    )
    .min(1),
});
