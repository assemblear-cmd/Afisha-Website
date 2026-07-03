import { PrismaClient } from '@prisma/client';
import { ensureAdminUser, syncCommerceDefaults } from './commerceDefaults';

// Non-destructive commerce sync: creates the 7 homepage tiles, promo
// services, and the admin account without touching events, shows, or orders.
// Run with: npm run db:sync-commerce

const prisma = new PrismaClient();

async function main() {
  await syncCommerceDefaults(prisma);
  const adminEmail = await ensureAdminUser(prisma);

  const tiles = await prisma.homepageTile.count();
  const services = await prisma.promoService.count();
  console.log('Commerce sync complete.');
  console.log(`  Homepage tiles: ${tiles}`);
  console.log(`  Promo services: ${services}`);
  console.log(`  Admin user:     ${adminEmail}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
