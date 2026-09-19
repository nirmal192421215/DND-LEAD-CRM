import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    orderBy: { serialNo: 'asc' },
    select: {
      serialNo: true,
      name: true,
      projectType: true,
      projectDescription: true,
      location: true,
      budgetLakhs: true,
      source: true,
      priority: true,
      phone: true,
      email: true,
      winProbability: true,
      tags: true,
    },
  });

  console.log('Exporting all leads count:', leads.length);

  const fileContent = `import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const ALL_LEADS_DATA = ${JSON.stringify(leads, null, 2)};

async function main() {
  console.log('🚀 Seeding verified leads starting at DND-001...');

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
    await prisma.$executeRawUnsafe("SELECT setval(pg_get_serial_sequence('leads', 'serialNo'), 1, false);");
  } catch (e) {}

  const owners = [gayathri, nirmal];

  for (let i = 0; i < ALL_LEADS_DATA.length; i++) {
    const item = ALL_LEADS_DATA[i];
    const owner = owners[i % owners.length];
    const leadCode = "DND-" + String(item.serialNo).padStart(3, '0');

    await prisma.lead.create({
      data: {
        id: leadCode,
        serialNo: item.serialNo,
        name: item.name,
        projectType: item.projectType,
        projectDescription: item.projectDescription,
        location: item.location,
        budgetLakhs: item.budgetLakhs,
        source: item.source || 'Google',
        priority: item.priority as any,
        phone: item.phone,
        email: item.email,
        ownerId: owner.id,
        winProbability: item.winProbability,
        tags: item.tags,
        stage: 'NEW',
        stageChangedAt: new Date(),
      },
    });
  }

  console.log('✅ Seeded all ' + ALL_LEADS_DATA.length + ' leads successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
`;

  fs.writeFileSync(__dirname + '/seed_dnd_leads.ts', fileContent);
  fs.writeFileSync(__dirname + '/seed.ts', fileContent);
  console.log('Wrote complete seed files with all leads!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
