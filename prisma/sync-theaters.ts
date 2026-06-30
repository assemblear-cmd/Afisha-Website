// Non-destructive sync of the source venues into the live database.
//
// Unlike `prisma/seed.ts` (which wipes Theater + Show before reseeding), this
// script upserts each venue by its unique `slug`, leaving every existing `Show`
// row and all per-theater scan state (isActive, lastScrapedAt, lastScrapeOk,
// lastError) untouched. Safe to run against a database that already holds real
// scraped shows.
//
//   npm run db:sync-theaters
//
// Source of truth: prisma/sourceVenues.ts (shared with seed.ts).

import { PrismaClient } from '@prisma/client';

import { SOURCE_VENUES } from './sourceVenues';

const prisma = new PrismaClient();

async function main() {
  const existingSlugs = new Set(
    (await prisma.theater.findMany({ select: { slug: true } })).map((t) => t.slug),
  );

  let created = 0;
  let updated = 0;

  for (const v of SOURCE_VENUES) {
    const data = {
      name: v.name,
      website: v.website,
      eventSources: v.eventSources ?? [v.website],
      adapter: v.adapter,
      categories: v.categories,
      city: 'Santiago',
    };

    await prisma.theater.upsert({
      where: { slug: v.slug },
      // Only the descriptive/source fields are synced. Scan state and shows are
      // intentionally left alone.
      update: data,
      create: { slug: v.slug, ...data },
    });

    if (existingSlugs.has(v.slug)) updated += 1;
    else created += 1;
  }

  const theaterCount = await prisma.theater.count();
  const showCount = await prisma.show.count();

  console.log('Theater sync complete (non-destructive).');
  console.log(`  Venues in source: ${SOURCE_VENUES.length}`);
  console.log(`  Created:          ${created}`);
  console.log(`  Updated:          ${updated}`);
  console.log(`  Theaters now:     ${theaterCount}`);
  console.log(`  Shows preserved:  ${showCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
