import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Default commerce data for the organizer module: the 7 homepage ad tiles
// (positions match the mosaic grid: 1 = 2x2 hero, 4/7 = wide), the promo
// services, and the admin account. Consumed by prisma/seed.ts (full reseed)
// and prisma/sync-commerce.ts (non-destructive upsert).

export const HOMEPAGE_TILES: Array<{
  position: number;
  name: string;
  description: string;
  hourlyPriceClp: number;
}> = [
  { position: 1, name: 'Tile 1 — Hero (2x2)', description: 'Large hero slot, top-left of the homepage mosaic.', hourlyPriceClp: 15000 },
  { position: 2, name: 'Tile 2 — Square', description: 'Square slot next to the hero.', hourlyPriceClp: 10000 },
  { position: 3, name: 'Tile 3 — Square', description: 'Square slot next to the hero.', hourlyPriceClp: 10000 },
  { position: 4, name: 'Tile 4 — Wide', description: 'Wide slot, second row.', hourlyPriceClp: 12000 },
  { position: 5, name: 'Tile 5 — Square', description: 'Square slot, second row.', hourlyPriceClp: 8000 },
  { position: 6, name: 'Tile 6 — Square', description: 'Square slot, third row.', hourlyPriceClp: 8000 },
  { position: 7, name: 'Tile 7 — Wide', description: 'Wide slot, bottom row.', hourlyPriceClp: 12000 },
];

export const PROMO_SERVICES: Array<{
  code: string;
  name: string;
  description: string;
  priceClp: number;
  sortOrder: number;
}> = [
  {
    code: 'instagram_post',
    name: 'Instagram post',
    description: 'Dedicated post about your event on the DondeGO Instagram feed.',
    priceClp: 45000,
    sortOrder: 1,
  },
  {
    code: 'instagram_story',
    name: 'Instagram story',
    description: 'Story about your event on the DondeGO Instagram.',
    priceClp: 25000,
    sortOrder: 2,
  },
  {
    code: 'telegram_repost',
    name: 'Telegram repost',
    description: 'Repost of your event in the DondeGO Telegram channel.',
    priceClp: 15000,
    sortOrder: 3,
  },
  {
    code: 'scanner_addon',
    name: 'Scanner add-on (free events)',
    description: 'Enables the QR check-in scanner for a free event.',
    priceClp: 20000,
    sortOrder: 4,
  },
];

/**
 * Idempotent sync of commerce defaults. Existing rows keep their (possibly
 * admin-edited) prices — only missing rows are created and labels refreshed.
 */
export async function syncCommerceDefaults(prisma: PrismaClient): Promise<void> {
  for (const tile of HOMEPAGE_TILES) {
    await prisma.homepageTile.upsert({
      where: { position: tile.position },
      create: tile,
      update: { name: tile.name, description: tile.description },
    });
  }

  for (const service of PROMO_SERVICES) {
    await prisma.promoService.upsert({
      where: { code: service.code },
      create: service,
      update: { name: service.name, description: service.description, sortOrder: service.sortOrder },
    });
  }
}

/**
 * Ensures the admin account exists. Password comes from ADMIN_SEED_PASSWORD;
 * the local-dev fallback matches the existing demo-account convention in
 * prisma/seed.ts — change it in any real deployment.
 */
export async function ensureAdminUser(prisma: PrismaClient): Promise<string> {
  const email = process.env.ADMIN_SEED_EMAIL ?? 'admin@dondego.test';
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'password123';
  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.warn('ADMIN_SEED_PASSWORD not set — using the local demo default. Do not use in production.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: 'DondeGO Admin', role: 'admin' },
    update: { role: 'admin' },
  });
  return email;
}
