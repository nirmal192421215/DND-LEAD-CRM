import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { FRESH_LEADS_DATA } from './seed_dnd_leads';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning and seeding DND Studio CRM database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const nirmal = await prisma.user.upsert({
    where: { email: 'nirmalkumar00727@gmail.com' },
    update: { name: 'Nirmal kumar N', role: 'ADMIN', initials: 'N' },
    create: { email: 'nirmalkumar00727@gmail.com', password: passwordHash, name: 'Nirmal kumar N', role: 'ADMIN', initials: 'N' },
  });

  const gayathri = await prisma.user.upsert({
    where: { email: 'gayathrideva2007@gmail.com' },
    update: { name: 'Gayathri', role: 'PRINCIPAL', initials: 'G' },
    create: { email: 'gayathrideva2007@gmail.com', password: passwordHash, name: 'Gayathri', role: 'PRINCIPAL', initials: 'G' },
  });

  await prisma.activity.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.fileAsset.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.lead.deleteMany({});

  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('leads', 'serialNo'), 1, false);`);
    console.log('Reset sequence to 1');
  } catch (e) {
    console.warn('Could not reset sequence via raw query:', e);
  }

  const owners = [gayathri, nirmal];

  for (let i = 0; i < FRESH_LEADS_DATA.length; i++) {
    const item = FRESH_LEADS_DATA[i];
    const owner = owners[i % owners.length];
    const leadCode = `DND-${String(i + 1).padStart(3, '0')}`;

    const tags = [
      'Fresh Lead',
      item.category,
      item.city,
      item.rating >= 4.5 ? 'Top Rated' : 'Verified',
    ];

    const description = `📍 Google Maps Listing: ${item.name} (${item.category})\n` +
      `★ Rating: ⭐ ${item.rating} (${item.reviews} reviews)\n` +
      `🏢 Address: ${item.address ? item.address + ', ' : ''}${item.city}, ${item.state}\n` +
      `🌐 Maps Link: ${item.url}\n` +
      `💡 Project: ${item.projectType}`;

    const winProb = item.priority === 'HOT' ? 75 : item.priority === 'WARM' ? 50 : 30;

    await prisma.lead.create({
      data: {
        id: leadCode,
        serialNo: item.serialNo,
        name: item.name,
        projectType: item.projectType,
        projectDescription: description,
        location: `${item.address ? item.address + ', ' : ''}${item.city}, ${item.state}`,
        budgetLakhs: item.budgetLakhs,
        source: 'Google',
        priority: item.priority as any,
        phone: item.phone,
        email: `contact@${item.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}.in`,
        ownerId: owner.id,
        winProbability: winProb,
        tags: JSON.stringify(tags),
        stage: 'NEW',
        stageChangedAt: new Date(),
      },
    });
  }

  console.log(`✅ Seeded ${FRESH_LEADS_DATA.length} fresh leads successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
