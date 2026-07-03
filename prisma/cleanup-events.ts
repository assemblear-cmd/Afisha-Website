import { prisma } from '../src/lib/prisma';
import { parseRetentionDays, runEventCleanup } from '../src/lib/event-cleanup';

function argValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dryRun');
  const retentionArg = argValue('--retention-days');
  const retentionDays = retentionArg == null ? undefined : parseRetentionDays(retentionArg);
  const result = await runEventCleanup({ dryRun, retentionDays });

  console.log(dryRun ? 'Event cleanup dry run complete.' : 'Event cleanup complete.');
  console.log(`  Retention days:              ${result.retentionDays}`);
  console.log(`  Cutoff:                      ${result.cutoff}`);
  console.log(`  Stale scraped shows matched: ${result.shows.matched}`);
  console.log(`  Stale scraped shows deleted: ${result.shows.deleted}`);
  console.log(`  Organizer events to finish:  ${result.organizerEvents.completedMatched}`);
  console.log(`  Organizer events completed:  ${result.organizerEvents.completed}`);
  console.log(`  Organizer events deletable:  ${result.organizerEvents.deleteMatched}`);
  console.log(`  Organizer events deleted:    ${result.organizerEvents.deleted}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
