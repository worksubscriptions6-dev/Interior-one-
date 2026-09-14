/**
 * Seeds the first owner account, the rate card and the twelve monthly targets
 * from the year one roadmap. Safe to run more than once.
 */
import { PrismaClient, Unit } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Supabase owns passwords. We create the auth user with the service role key,
 * then mirror it into our User table using the same uid as the primary key.
 */
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const RATES: { group: string; name: string; spec: string; unit: Unit; cost: number; markupPct: number }[] = [
  { group: 'Modular kitchen', name: 'Kitchen top unit', spec: 'Laminated hardwood fibre board carcase with soft-close hinged shutters', unit: 'RFT', cost: 1150, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Kitchen bottom unit', spec: '100% Gurjan BWP plywood carcase with soft-close hinged shutters', unit: 'RFT', cost: 1850, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Tall unit / larder', spec: 'Full height storage unit with soft-close shutters', unit: 'RFT', cost: 1950, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Breakfast counter', spec: '32mm ledge top with panelling below', unit: 'RFT', cost: 1600, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Granite counter top 18mm', spec: 'Includes cutting, edge polishing, sink and hob cutout, transport and fixing', unit: 'SQFT', cost: 420, markupPct: 40 },
  { group: 'Modular kitchen', name: 'Quartz counter top', spec: '18mm engineered quartz, includes cutting, polishing and fixing', unit: 'SQFT', cost: 950, markupPct: 40 },
  { group: 'Modular kitchen', name: 'Kitchen wall tile fixing', spec: 'Supply and fixing of wall tile above counter', unit: 'SQFT', cost: 140, markupPct: 40 },
  { group: 'Modular kitchen', name: 'Cutlery tray with soft-close drawer', spec: 'Premium soft-close drawer with cutlery tray', unit: 'NOS', cost: 4600, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Bottle pull-out', spec: 'Two shelf bottle pull-out with soft-close drawer', unit: 'NOS', cost: 5200, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Cargo plate rack', spec: 'Plate rack with soft-close drawer', unit: 'NOS', cost: 4800, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Glass, plate and drip tray unit', spec: 'Three tier tray unit, 60cm', unit: 'NOS', cost: 4200, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Waste bin, swing out', spec: 'Swing out waste bin fitted to shutter', unit: 'NOS', cost: 1750, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Detergent holder', spec: 'Under sink detergent holder', unit: 'NOS', cost: 1150, markupPct: 45 },
  { group: 'Modular kitchen', name: 'Chimney 90cm', spec: 'Auto clean chimney with baffle filter and touch control', unit: 'NOS', cost: 18000, markupPct: 30 },
  { group: 'Modular kitchen', name: 'Hob, 3 burner 75cm', spec: 'Toughened glass top hob with auto ignition and flame failure device', unit: 'NOS', cost: 12500, markupPct: 30 },
  { group: 'Modular kitchen', name: 'Stainless steel sink', spec: 'Premium single or double bowl sink with drainboard', unit: 'NOS', cost: 6500, markupPct: 35 },

  { group: 'Wardrobe & bedroom', name: 'Wardrobe, hinged shutter', spec: 'Carcase with soft-close hinged shutters, internal shelves and hanging rod', unit: 'SQFT', cost: 1250, markupPct: 45 },
  { group: 'Wardrobe & bedroom', name: 'Wardrobe, sliding shutter', spec: 'Sliding shutter wardrobe with premium soft-close track', unit: 'SQFT', cost: 1650, markupPct: 45 },
  { group: 'Wardrobe & bedroom', name: 'Loft storage', spec: 'Overhead loft storage with hinged shutters', unit: 'SQFT', cost: 900, markupPct: 45 },
  { group: 'Wardrobe & bedroom', name: 'King size cot with storage', spec: '183 x 190.5cm, one side storage, with headboard. Mattress not included', unit: 'NOS', cost: 32000, markupPct: 45 },
  { group: 'Wardrobe & bedroom', name: 'Queen size cot with storage', spec: '152.4 x 190.5cm, one side storage, with headboard. Mattress not included', unit: 'NOS', cost: 26000, markupPct: 45 },
  { group: 'Wardrobe & bedroom', name: 'Bed side table', spec: 'W60 x D40 x H35cm with profile handle', unit: 'NOS', cost: 6200, markupPct: 45 },
  { group: 'Wardrobe & bedroom', name: 'Dressing unit with mirror', spec: 'Bottom storage, drawers and plain mirror with aluminium profile', unit: 'NOS', cost: 15500, markupPct: 45 },
  { group: 'Wardrobe & bedroom', name: 'Study or table unit', spec: '32mm ledge top with panelling and top storage', unit: 'SQFT', cost: 1150, markupPct: 45 },

  { group: 'Living & dining', name: 'TV unit bottom storage', spec: 'Storage unit with soft-close shutters and drawers', unit: 'SQFT', cost: 1250, markupPct: 45 },
  { group: 'Living & dining', name: 'TV back panelling', spec: 'Panelling with laminate or veneer finish', unit: 'SQFT', cost: 850, markupPct: 45 },
  { group: 'Living & dining', name: 'Crockery or wash counter unit', spec: 'Counter unit with storage and shutters', unit: 'SQFT', cost: 1350, markupPct: 45 },
  { group: 'Living & dining', name: 'Wall panelling, PVC or charcoal', spec: 'Decorative wall panelling with fixing', unit: 'SQFT', cost: 520, markupPct: 45 },
  { group: 'Living & dining', name: 'Cement texture finish', spec: 'Textured wall finish with sealer', unit: 'SQFT', cost: 150, markupPct: 45 },
  { group: 'Living & dining', name: 'Shoe rack', spec: 'Entry shoe storage with shutters', unit: 'SQFT', cost: 1100, markupPct: 45 },

  { group: 'Ceiling & partition', name: 'Gypsum false ceiling, plain', spec: 'Gypsum board on GI channel framework, jointing and finishing', unit: 'SQFT', cost: 85, markupPct: 40 },
  { group: 'Ceiling & partition', name: 'Gypsum false ceiling with cove', spec: 'Peripheral cove with concealed lighting provision', unit: 'SQFT', cost: 120, markupPct: 40 },
  { group: 'Ceiling & partition', name: 'Gypsum designer ceiling', spec: 'Multi level designer ceiling with profile detailing', unit: 'SQFT', cost: 165, markupPct: 45 },
  { group: 'Ceiling & partition', name: 'Grid ceiling 2x2', spec: 'Mineral fibre grid ceiling with T-grid framework', unit: 'SQFT', cost: 75, markupPct: 40 },
  { group: 'Ceiling & partition', name: 'Gypsum partition, both sides', spec: 'Double sided gypsum partition with framework and insulation', unit: 'SQFT', cost: 115, markupPct: 40 },
  { group: 'Ceiling & partition', name: 'Cove or profile lighting', spec: 'LED profile lighting with driver, fixed in cove', unit: 'RFT', cost: 190, markupPct: 40 },

  { group: 'Commercial', name: 'Display rack', spec: 'Display shelving with laminate finish and lighting provision', unit: 'SQFT', cost: 1150, markupPct: 45 },
  { group: 'Commercial', name: 'Cash counter', spec: 'Counter with storage, drawers and cable management', unit: 'SQFT', cost: 1500, markupPct: 45 },
  { group: 'Commercial', name: 'Signage backdrop panelling', spec: 'Backdrop panelling for signage with fixing', unit: 'SQFT', cost: 700, markupPct: 45 },

  { group: 'Site & other', name: 'Electrical point shifting', spec: 'Shifting or providing a new point including wiring and making good', unit: 'NOS', cost: 450, markupPct: 40 },
  { group: 'Site & other', name: 'Painting, two coats emulsion', spec: 'Putty, primer and two coats of emulsion', unit: 'SQFT', cost: 26, markupPct: 40 },
  { group: 'Site & other', name: 'Transport and unloading', spec: 'Delivery of material to site and unloading', unit: 'LUMP', cost: 4000, markupPct: 25 },
  { group: 'Site & other', name: 'Site protection and cleaning', spec: 'Floor protection during work and deep clean before handover', unit: 'LUMP', cost: 3500, markupPct: 25 },
];

const TARGETS: Record<string, number> = {
  '2026-10': 300000, '2026-11': 400000, '2026-12': 500000,
  '2027-01': 600000, '2027-02': 600000, '2027-03': 800000,
  '2027-04': 900000, '2027-05': 1000000, '2027-06': 1100000,
  '2027-07': 1200000, '2027-08': 1300000, '2027-09': 1500000,
};

const WA_DEFAULT =
  'Hello {name}, this is {sender} from Interior One, Karunagappally.\n\n' +
  'Thank you for your enquiry about {type}. We are an architect-led interior studio — ' +
  'we design around your home instead of fitting it into a catalogue, and we stay with you ' +
  'through flooring, lighting, colour and furniture as well.\n\n' +
  'Could I know a little about what you have in mind, and when the site will be ready? ' +
  'I can arrange a visit from our architect at a time that suits you.';

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL ?? 'boss@interiorone.in').toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? 'changeme123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Boss' },
    });
    if (error) throw error;

    await prisma.user.create({
      data: {
        id: data.user!.id,
        email,
        name: 'Boss',
        role: 'OWNER',
        // Quick-unlock PIN. Change it in Settings once you are in.
        pinHash: await bcrypt.hash(process.env.SEED_OWNER_PIN ?? '1188', 10),
      },
    });
    console.log(`owner created: ${email} (PIN ${process.env.SEED_OWNER_PIN ?? '1188'})`);
  } else {
    console.log(`owner already there: ${email}`);
  }

  if ((await prisma.rateItem.count()) === 0) {
    await prisma.rateItem.createMany({ data: RATES });
    console.log(`rate card: ${RATES.length} items`);
  }

  for (const [month, revenue] of Object.entries(TARGETS)) {
    await prisma.monthlyTarget.upsert({
      where: { month },
      update: {},
      create: { month, revenue },
    });
  }
  console.log(`targets: ${Object.keys(TARGETS).length} months`);

  const settings: [string, unknown][] = [
    ['waFirst', WA_DEFAULT],
    ['breakEven', 700000],
    ['gstPct', 18],
    ['markupFloor', 35],
    ['markupTarget', 45],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as never },
    });
  }
  console.log('settings written');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
