import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@smartattendance.com' },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: {
      email: 'admin@smartattendance.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('Admin user created successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
