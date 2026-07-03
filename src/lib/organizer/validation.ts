import { z } from 'zod';
import { coverImageSchema } from '@/lib/cover-image';

// Zod schemas for the organizer/commerce module. Kept separate from
// src/lib/validations.ts (legacy MVP flows) so the two feature areas evolve
// independently.

export const organizerEventSchema = z.object({
  title: z.string().min(3).max(140),
  shortDescription: z.string().max(280).optional().or(z.literal('')),
  description: z.string().min(10),
  category: z.string().min(1),
  venue: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1).default('Santiago'),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  eventType: z.enum(['paid', 'free']),
  coverImage: coverImageSchema,
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).optional().or(z.literal('')),
});

export const ticketTypeCreateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().or(z.literal('')),
  price: z.coerce.number().int().min(0),
  currency: z.string().default('CLP'),
  quantity: z.coerce.number().int().min(1),
  perOrderLimit: z.coerce.number().int().min(1).optional().nullable(),
  salesStartAt: z.string().optional().or(z.literal('')),
  salesEndAt: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED']).default('ACTIVE'),
});

export const ticketTypeUpdateSchema = ticketTypeCreateSchema.partial();

export const ticketCheckoutSchema = z.object({
  eventId: z.string().min(1),
  buyerName: z.string().min(2),
  buyerEmail: z.string().email(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.coerce.number().int().min(0).max(20),
      })
    )
    .min(1),
});

export const promotionQuoteSchema = z.object({
  tileId: z.string().min(1),
  startAt: z.string().min(1),
  hours: z.coerce.number().int().min(1),
});

export const promotionCheckoutSchema = z.object({
  eventId: z.string().min(1),
  tile: z
    .object({
      tileId: z.string().min(1),
      startAt: z.string().min(1),
      hours: z.coerce.number().int().min(1),
    })
    .optional(),
  serviceCodes: z.array(z.string().min(1)).default([]),
});

export const scanRequestSchema = z.object({
  eventId: z.string().min(1),
  value: z.string().min(1).max(2048),
});

export const scannerGrantSchema = z.object({
  email: z.string().email(),
});

export const payoutRequestSchema = z.object({
  eventId: z.string().min(1),
  amountClp: z.coerce.number().int().positive().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const MODERATION_ACTIONS = [
  'approve',
  'reject',
  'archive',
  // Unlocks payouts: organizers can only request them for COMPLETED events.
  'complete',
] as const;

export const moderationActionSchema = z.object({
  action: z.enum(MODERATION_ACTIONS),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const promoItemActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'fulfill']),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const payoutActionSchema = z.object({
  action: z.enum(['start_review', 'approve', 'reject', 'mark_paid']),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const adminPricingSchema = z.object({
  tiles: z
    .array(z.object({ id: z.string().min(1), hourlyPriceClp: z.coerce.number().int().positive() }))
    .default([]),
  services: z
    .array(z.object({ id: z.string().min(1), priceClp: z.coerce.number().int().positive() }))
    .default([]),
});

export const ticketAdminActionSchema = z.object({
  action: z.enum(['invalidate', 'cancel']),
});
