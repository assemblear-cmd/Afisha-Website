import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type TicketSeed = { name: string; priceCents: number; quantity: number; sold: number };

type EventSeed = {
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  address: string;
  startsAt: Date;
  endsAt: Date;
  slug: string;
  organizer: 'a' | 'b';
  tickets: TicketSeed[];
};

function img(slug: string): string {
  return `https://picsum.photos/seed/${slug}/800/450`;
}

// Helper to build a same-day event window.
function day(year: number, month: number, date: number, startHour: number, durationHours: number) {
  const startsAt = new Date(year, month - 1, date, startHour, 0, 0);
  const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);
  return { startsAt, endsAt };
}

const events: EventSeed[] = [
  {
    title: 'Sunset Rooftop Live: Indie Night',
    description:
      'Catch a curated lineup of rising indie bands as the sun dips behind the skyline. Expect dreamy guitars, warm synths, and a crowd that actually listens. Craft cocktails and local food trucks keep the rooftop buzzing all evening.',
    category: 'music',
    venue: 'The Heights Rooftop',
    city: 'New York',
    address: '120 Greenwich St, New York, NY',
    ...day(2026, 7, 18, 19, 4),
    slug: 'afisha-music-rooftop',
    organizer: 'a',
    tickets: [
      { name: 'General Admission', priceCents: 2500, quantity: 300, sold: 42 },
      { name: 'VIP Balcony', priceCents: 7500, quantity: 80, sold: 11 },
    ],
  },
  {
    title: 'Founders Summit 2026: Scaling from Zero',
    description:
      'A full day of candid talks from founders who have been through the trenches. Learn how to find product-market fit, hire your first ten people, and raise without losing your soul. Includes structured networking and office-hours with operators.',
    category: 'business',
    venue: 'Moscone Center West',
    city: 'San Francisco',
    address: '800 Howard St, San Francisco, CA',
    ...day(2026, 8, 6, 9, 9),
    slug: 'afisha-business-founders',
    organizer: 'a',
    tickets: [
      { name: 'Standard', priceCents: 14900, quantity: 500, sold: 130 },
      { name: 'Founder Pass (VIP)', priceCents: 39900, quantity: 100, sold: 28 },
    ],
  },
  {
    title: 'Austin BBQ & Bourbon Crawl',
    description:
      'Tour the best smokehouses in town with a guided crawl through brisket, ribs, and small-batch bourbon. Each stop pairs a signature plate with a tasting pour. Come hungry and leave with a new favorite pitmaster.',
    category: 'food-drink',
    venue: 'East Side Food Hall',
    city: 'Austin',
    address: '1209 E 7th St, Austin, TX',
    ...day(2026, 9, 12, 13, 4),
    slug: 'afisha-food-bbq',
    organizer: 'b',
    tickets: [
      { name: 'General Admission', priceCents: 6500, quantity: 200, sold: 64 },
      { name: 'Designated Driver', priceCents: 3500, quantity: 60, sold: 9 },
    ],
  },
  {
    title: 'Modern Canvas: Contemporary Art Walk',
    description:
      'Stroll through a one-night pop-up featuring twenty emerging painters and sculptors. Meet the artists, watch live demonstrations, and vote for the audience prize. A relaxed, gallery-style evening with wine and ambient sound.',
    category: 'performing-visual-arts',
    venue: 'Pioneer Square Galleries',
    city: 'Seattle',
    address: '300 1st Ave S, Seattle, WA',
    ...day(2026, 9, 26, 18, 4),
    slug: 'afisha-arts-canvas',
    organizer: 'b',
    tickets: [{ name: 'Free Admission', priceCents: 0, quantity: 400, sold: 150 }],
  },
  {
    title: 'DevConf: The AI Engineering Track',
    description:
      'A practitioner-focused conference on shipping AI features that actually work in production. Sessions cover evals, retrieval, latency, and cost control. Bring a laptop for the hands-on labs in the afternoon.',
    category: 'lectures',
    venue: 'McCormick Place',
    city: 'Chicago',
    address: '2301 S King Dr, Chicago, IL',
    ...day(2026, 10, 3, 9, 8),
    slug: 'afisha-tech-devconf',
    organizer: 'a',
    tickets: [
      { name: 'General Admission', priceCents: 9900, quantity: 450, sold: 88 },
      { name: 'Workshop + Conference (VIP)', priceCents: 24900, quantity: 120, sold: 31 },
    ],
  },
  {
    title: 'City Marathon Eve: 5K Fun Run',
    description:
      'Loosen up the night before the big race with a relaxed, untimed 5K through downtown. Pace groups welcome runners of every level. Finish at the riverside expo for stretching, hydration, and a free finisher band.',
    category: 'hobbies',
    venue: 'Riverside Promenade',
    city: 'Los Angeles',
    address: '100 Aliso St, Los Angeles, CA',
    ...day(2026, 10, 17, 18, 2),
    slug: 'afisha-sports-5k',
    organizer: 'b',
    tickets: [
      { name: 'Runner Entry', priceCents: 3000, quantity: 500, sold: 210 },
      { name: 'Free Cheer Squad', priceCents: 0, quantity: 300, sold: 47 },
    ],
  },
  {
    title: 'Mindful Mornings: Yoga & Breathwork Retreat',
    description:
      'Start your day with a grounding flow followed by guided breathwork and a short meditation. Suitable for all levels, mats provided. Stay afterward for herbal tea and a gentle community circle.',
    category: 'hobbies',
    venue: 'Cherry Creek Wellness Studio',
    city: 'Denver',
    address: '250 Detroit St, Denver, CO',
    ...day(2026, 11, 7, 8, 3),
    slug: 'afisha-health-yoga',
    organizer: 'b',
    tickets: [
      { name: 'General Admission', priceCents: 2500, quantity: 120, sold: 33 },
      { name: 'Retreat + Brunch (VIP)', priceCents: 6500, quantity: 40, sold: 12 },
    ],
  },
  {
    title: 'Neighborhood Build Day & Block Party',
    description:
      'Roll up your sleeves for a morning of community gardening and mural painting, then stick around for the block party. Live DJs, kids activities, and food from local vendors. Everyone is welcome, no experience needed.',
    category: 'nightlife',
    venue: 'Wynwood Community Park',
    city: 'Miami',
    address: '2700 NW 2nd Ave, Miami, FL',
    ...day(2026, 11, 21, 10, 6),
    slug: 'afisha-community-blockparty',
    organizer: 'a',
    tickets: [{ name: 'Free RSVP', priceCents: 0, quantity: 500, sold: 188 }],
  },
  {
    title: 'Indie Film Festival: Opening Night',
    description:
      'The opening gala of a three-day celebration of independent cinema. Watch the premiere short-film block, then join the directors for a moderated Q&A. A red-carpet reception with sparkling wine follows the screening.',
    category: 'performing-visual-arts',
    venue: 'Hollywood Theatre',
    city: 'Portland',
    address: '4122 NE Sandy Blvd, Portland, OR',
    ...day(2026, 12, 4, 19, 4),
    slug: 'afisha-film-festival',
    organizer: 'b',
    tickets: [
      { name: 'General Admission', priceCents: 4500, quantity: 250, sold: 73 },
      { name: 'Gala VIP Pass', priceCents: 12000, quantity: 60, sold: 18 },
    ],
  },
  {
    title: 'Winter Style Lab: Sustainable Fashion Show',
    description:
      'A runway showcase spotlighting independent designers working with recycled and natural materials. Between walks, browse the pop-up market and meet the makers. Proceeds support a local textile-recycling nonprofit.',
    category: 'holidays',
    venue: 'SoWa Power Station',
    city: 'Boston',
    address: '550 Harrison Ave, Boston, MA',
    ...day(2026, 12, 12, 18, 3),
    slug: 'afisha-fashion-stylelab',
    organizer: 'a',
    tickets: [
      { name: 'General Admission', priceCents: 3500, quantity: 220, sold: 54 },
      { name: 'Front Row (VIP)', priceCents: 9500, quantity: 50, sold: 16 },
    ],
  },
  {
    title: 'Jazz & Vinyl: Late Night Sessions',
    description:
      'An intimate evening of live jazz trios followed by a vinyl-only DJ set spinning rare grooves. Low lights, great acoustics, and a serious record crowd. Limited seating keeps things close and warm.',
    category: 'music',
    venue: 'The Blue Room',
    city: 'New York',
    address: '76 W 3rd St, New York, NY',
    ...day(2026, 7, 31, 20, 5),
    slug: 'afisha-music-jazz',
    organizer: 'b',
    tickets: [
      { name: 'General Admission', priceCents: 3000, quantity: 150, sold: 60 },
      { name: 'Reserved Table (VIP)', priceCents: 8500, quantity: 30, sold: 8 },
    ],
  },
  {
    title: 'Product Leaders Workshop: Roadmaps That Ship',
    description:
      'A hands-on, half-day workshop for product managers and founders who want roadmaps the whole team believes in. Work through prioritization frameworks, stakeholder alignment, and outcome metrics. Leave with a template you can use Monday morning.',
    category: 'lectures',
    venue: 'SoMa Innovation Loft',
    city: 'San Francisco',
    address: '475 Brannan St, San Francisco, CA',
    ...day(2026, 8, 22, 13, 4),
    slug: 'afisha-business-roadmaps',
    organizer: 'a',
    tickets: [
      { name: 'General Admission', priceCents: 7900, quantity: 100, sold: 22 },
      { name: 'Free Waitlist Seat', priceCents: 0, quantity: 25, sold: 25 },
    ],
  },

  // --- Teatros de Santiago (repertorio) ---------------------------------
  // Reuse Event.venue as the theater identity; category 'performing-visual-arts'.
  // CLP prices are stored as cents (CLP * 100) to match the priceCents convention.
  {
    title: 'Don Giovanni — Ópera en dos actos',
    description:
      'La obra maestra de Mozart regresa al Municipal con una puesta en escena contemporánea y orquesta en vivo. Funciones con sobretítulos en español.',
    category: 'performing-visual-arts',
    venue: 'Teatro Municipal de Santiago',
    city: 'Santiago',
    address: 'Agustinas 794, Santiago, Región Metropolitana',
    ...day(2026, 7, 18, 19, 3),
    slug: 'teatro-municipal-don-giovanni',
    organizer: 'a',
    tickets: [
      { name: 'Galería', priceCents: 1200000, quantity: 200, sold: 40 },
      { name: 'Platea', priceCents: 2500000, quantity: 150, sold: 65 },
    ],
  },
  {
    title: 'El Lago de los Cisnes — Ballet',
    description:
      'El clásico de Chaikovski interpretado por el Ballet de Santiago, con la Orquesta Filarmónica en el foso. Una velada imperdible para los amantes de la danza.',
    category: 'performing-visual-arts',
    venue: 'Teatro Municipal de Santiago',
    city: 'Santiago',
    address: 'Agustinas 794, Santiago, Región Metropolitana',
    ...day(2026, 8, 9, 20, 3),
    slug: 'teatro-municipal-lago-cisnes',
    organizer: 'a',
    tickets: [
      { name: 'Galería', priceCents: 1500000, quantity: 200, sold: 80 },
      { name: 'Platea', priceCents: 4500000, quantity: 120, sold: 33 },
    ],
  },
  {
    title: 'Concierto de Gala: Verdi',
    description:
      'Una selección de las arias y coros más célebres de Giuseppe Verdi en una noche de gala con solistas invitados.',
    category: 'performing-visual-arts',
    venue: 'Teatro Municipal de Santiago',
    city: 'Santiago',
    address: 'Agustinas 794, Santiago, Región Metropolitana',
    ...day(2026, 9, 5, 19, 2),
    slug: 'teatro-municipal-gala-verdi',
    organizer: 'a',
    tickets: [{ name: 'Entrada general', priceCents: 1800000, quantity: 300, sold: 90 }],
  },
  {
    title: 'Sinfónica: Beethoven 9',
    description:
      'La Novena Sinfonía de Beethoven con coro y orquesta completa. Un cierre de temporada monumental en el Teatro de la Universidad de Chile.',
    category: 'performing-visual-arts',
    venue: 'Teatro Universidad de Chile',
    city: 'Santiago',
    address: 'Av. Providencia 043, Providencia, Santiago',
    ...day(2026, 7, 26, 19, 2),
    slug: 'teatro-uchile-beethoven-9',
    organizer: 'b',
    tickets: [{ name: 'Entrada general', priceCents: 1500000, quantity: 400, sold: 120 }],
  },
  {
    title: 'Recital de Piano: Chopin',
    description:
      'Un recorrido íntimo por nocturnos, baladas y polonesas de Frédéric Chopin a cargo de un pianista de renombre internacional.',
    category: 'performing-visual-arts',
    venue: 'Teatro Universidad de Chile',
    city: 'Santiago',
    address: 'Av. Providencia 043, Providencia, Santiago',
    ...day(2026, 8, 30, 20, 2),
    slug: 'teatro-uchile-recital-chopin',
    organizer: 'b',
    tickets: [{ name: 'Entrada general', priceCents: 1200000, quantity: 400, sold: 75 }],
  },
  {
    title: 'Antígona — Teatro contemporáneo',
    description:
      'Una relectura contemporánea de la tragedia de Sófocles montada en el Centro GAM, con dramaturgia chilena y elenco local.',
    category: 'performing-visual-arts',
    venue: 'Centro GAM',
    city: 'Santiago',
    address: 'Av. Libertador Bernardo O’Higgins 227, Santiago',
    ...day(2026, 8, 15, 20, 2),
    slug: 'gam-antigona',
    organizer: 'b',
    tickets: [{ name: 'Entrada general', priceCents: 900000, quantity: 250, sold: 60 }],
  },
  {
    title: 'Danza Moderna: Cuerpos en Tránsito',
    description:
      'Compañía de danza contemporánea presenta una obra sobre el movimiento urbano y la migración, con música original en vivo.',
    category: 'performing-visual-arts',
    venue: 'Centro GAM',
    city: 'Santiago',
    address: 'Av. Libertador Bernardo O’Higgins 227, Santiago',
    ...day(2026, 9, 20, 19, 2),
    slug: 'gam-cuerpos-en-transito',
    organizer: 'b',
    tickets: [{ name: 'Entrada general', priceCents: 1000000, quantity: 250, sold: 48 }],
  },
];

async function main() {
  // Delete in FK-safe order.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = bcrypt.hashSync('password123', 10);

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@afisha.test',
      name: 'Olivia Organizer',
      role: 'organizer',
      passwordHash,
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      email: 'studio@afisha.test',
      name: 'Mile High Studio',
      role: 'organizer',
      passwordHash,
    },
  });

  await prisma.user.create({
    data: {
      email: 'visitor@afisha.test',
      name: 'Victor Visitor',
      role: 'visitor',
      passwordHash,
    },
  });

  for (const e of events) {
    const organizerId = e.organizer === 'a' ? organizer.id : organizer2.id;
    await prisma.event.create({
      data: {
        title: e.title,
        description: e.description,
        category: e.category,
        venue: e.venue,
        city: e.city,
        address: e.address,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        coverImage: img(e.slug),
        isPublished: true,
        organizerId,
        ticketTypes: {
          create: e.tickets.map((t) => ({
            name: t.name,
            priceCents: t.priceCents,
            quantity: t.quantity,
            sold: t.sold,
          })),
        },
      },
    });
  }

  // --- Scraped theater aggregator: the 11 source theaters + sample shows ----
  // Sample shows seed the two reference theaters so the list renders before the
  // daily scraper has run. Real shows arrive via runScrape() (cron).
  await prisma.show.deleteMany();
  await prisma.theater.deleteMany();

  const theaters: { slug: string; name: string; website: string; adapter: string | null }[] = [
    { slug: 'municipal-santiago', name: 'Teatro Municipal de Santiago', website: 'https://www.municipal.cl', adapter: 'municipal' },
    { slug: 'municipal-las-condes', name: 'Teatro Municipal de Las Condes', website: 'https://www.tmlascondes.cl', adapter: null },
    { slug: 'gam', name: 'Centro Cultural Gabriela Mistral (GAM)', website: 'https://www.gam.cl', adapter: 'gam' },
    { slug: 'teatro-uc', name: 'Teatro UC (Universidad Católica)', website: 'https://www.teatrouc.cl', adapter: 'teatrouc' },
    { slug: 'teatro-del-puente', name: 'Teatro del Puente', website: 'https://www.teatrodelpuente.cl', adapter: null },
    { slug: 'teatro-mori', name: 'Teatro Mori', website: 'https://www.teatromori.cl', adapter: null },
    { slug: 'teatro-sidarte', name: 'Teatro Sidarte', website: 'https://www.sidarte.cl', adapter: null },
    { slug: 'teatro-azares', name: 'Teatro Azares', website: 'https://www.teatroazares.cl', adapter: null },
    { slug: 'teatro-nunoa', name: 'Teatro Municipal de Ñuñoa', website: 'https://www.nunoa.cl/teatro-municipal', adapter: null },
  ];

  const sampleShows: Record<
    string,
    { externalId: string; title: string; startsAt: Date; priceCents: number; sourceUrl: string }[]
  > = {
    'municipal-santiago': [
      { externalId: 'sample-municipal-don-giovanni', title: 'Don Giovanni — Ópera', startsAt: day(2026, 7, 18, 19, 3).startsAt, priceCents: 2500000, sourceUrl: 'https://www.municipal.cl' },
      { externalId: 'sample-municipal-lago-cisnes', title: 'El Lago de los Cisnes — Ballet', startsAt: day(2026, 8, 9, 20, 3).startsAt, priceCents: 3000000, sourceUrl: 'https://www.municipal.cl' },
    ],
    gam: [
      { externalId: 'sample-gam-antigona', title: 'Antígona — Teatro contemporáneo', startsAt: day(2026, 8, 15, 20, 2).startsAt, priceCents: 900000, sourceUrl: 'https://www.gam.cl' },
      { externalId: 'sample-gam-danza', title: 'Danza Moderna: Cuerpos en Tránsito', startsAt: day(2026, 9, 20, 19, 2).startsAt, priceCents: 1000000, sourceUrl: 'https://www.gam.cl' },
    ],
  };

  for (const t of theaters) {
    const theater = await prisma.theater.create({
      data: { slug: t.slug, name: t.name, website: t.website, adapter: t.adapter, city: 'Santiago' },
    });
    for (const s of sampleShows[t.slug] ?? []) {
      await prisma.show.create({
        data: {
          theaterId: theater.id,
          externalId: s.externalId,
          title: s.title,
          startsAt: s.startsAt,
          category: 'teatro',
          priceCents: s.priceCents,
          currency: 'CLP',
          sourceUrl: s.sourceUrl,
        },
      });
    }
  }

  const theaterCount = await prisma.theater.count();
  const showCount = await prisma.show.count();
  console.log(`  Theaters:     ${theaterCount}`);
  console.log(`  Shows:        ${showCount}`);

  const eventCount = await prisma.event.count();
  const ticketCount = await prisma.ticketType.count();

  console.log('Seed complete.');
  console.log(`  Users:        3`);
  console.log(`  Events:       ${eventCount}`);
  console.log(`  Ticket types: ${ticketCount}`);
  console.log('');
  console.log('Demo credentials (password for all: password123):');
  console.log('  Organizer 1: organizer@afisha.test');
  console.log('  Organizer 2: studio@afisha.test');
  console.log('  Visitor:     visitor@afisha.test');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
