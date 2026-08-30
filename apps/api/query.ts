import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.lrvwfcxwiwewspyboiwi:DndSecurePass123!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    },
  },
});

async function main() {
  const users = await prisma.user.findMany();
  console.log("USERS:", users);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
