import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning and seeding DND Studio CRM database...');

  // Delete all existing leads and related records for a clean slate
  await prisma.activity.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.fileAsset.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.refreshToken.deleteMany({});

  console.log('🧹 Purged all previous leads, notes, activities, and proposals.');

  // ─── Create Admin / Principal User ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const principal = await prisma.user.upsert({
    where: { email: 'nirmalkumar00727@gmail.com' },
    update: {
      name: 'Nirmal kumar N',
      role: 'ADMIN',
      initials: 'N',
      password: passwordHash,
    },
    create: {
      email: 'nirmalkumar00727@gmail.com',
      password: passwordHash,
      name: 'Nirmal kumar N',
      role: 'ADMIN',
      initials: 'N',
    },
  });

  const principal2 = await prisma.user.upsert({
    where: { email: 'gayathrideva2007@gmail.com' },
    update: {
      name: 'Gayathri Deva',
      role: 'PRINCIPAL',
      initials: 'GD',
      password: passwordHash,
    },
    create: {
      email: 'gayathrideva2007@gmail.com',
      password: passwordHash,
      name: 'Gayathri Deva',
      role: 'PRINCIPAL',
      initials: 'GD',
    },
  });

  // Remove old seed users if they exist
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['arparthibanmoorthy@gmail.com', 'principal@bindbuild.com', 'priya@bindbuild.com', 'rahul@bindbuild.com']
      }
    }
  });

  console.log(`✅ Admin users active: ${principal.name} and ${principal2.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
