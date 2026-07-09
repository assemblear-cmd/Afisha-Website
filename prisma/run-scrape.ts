import { runScrape, type ScrapeGroup } from '../src/lib/scrapers';

// Manual scan of active sources (bespoke adapters + generic JSON-LD fallback).
//   npm run db:scrape                     — venue sites (daily group)
//   npm run db:scrape -- --group=platforms — Eventbrite/Fever/viagogo/StubHub
//   npm run db:scrape -- --group=all       — everything

function parseGroup(): ScrapeGroup {
  const arg = process.argv.find((a) => a.startsWith('--group='))?.slice('--group='.length);
  return arg === 'platforms' || arg === 'all' ? arg : 'venues';
}

async function main() {
  const startedAt = Date.now();
  const results = await runScrape(parseGroup());

  const withShows = results.filter((r) => r.found > 0).sort((a, b) => b.found - a.found);
  const failed = results.filter((r) => !r.ok);

  for (const r of withShows) {
    console.log(`  ${r.theater}: ${r.found} found, ${r.upserted} upserted`);
  }
  if (failed.length > 0) {
    console.log('Failures:');
    for (const r of failed) {
      console.log(`  ${r.theater}: ${r.error?.slice(0, 120)}`);
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      found: acc.found + r.found,
      upserted: acc.upserted + r.upserted,
      failed: acc.failed + (r.ok ? 0 : 1),
    }),
    { found: 0, upserted: 0, failed: 0 }
  );
  console.log(
    `Scrape complete in ${Math.round((Date.now() - startedAt) / 1000)}s: ` +
      `${results.length} sources, ${totals.found} events found, ` +
      `${totals.upserted} upserted, ${totals.failed} sources failed/empty-with-error.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
