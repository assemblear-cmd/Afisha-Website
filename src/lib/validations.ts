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
