#!/usr/bin/env node
/**
 * Reset Admin Password Script
 * Usage: npx tsx scripts/reset-admin-password.ts [newPassword] [email]
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const args = process.argv.slice(2);
  const newPassword = args[0] || 'Admin123!@#';
  const adminEmail = args[1] || 'admin@automation.local';

  console.log('🔐 Resetting admin password...');
  console.log(`   Email: ${adminEmail}`);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!user) {
    console.error(`❌ User not found: ${adminEmail}`);
    console.log('\n💡 Available users:');
    const users = await prisma.user.findMany({
      select: { email: true, name: true },
      take: 10,
    });
    users.forEach(u => console.log(`   - ${u.email} (${u.name})`));
    process.exit(1);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { email: adminEmail },
    data: { 
      password: hashedPassword,
      verified: true, // Ensure account is verified
    },
  });

  console.log('\n✅ Password reset successfully!');
  console.log('\n📧 Login Credentials:');
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${newPassword}`);
  console.log('\n🔗 Login URL:');
  console.log('   http://localhost:5173/login');
  console.log('\n⚠️  Please change this password after login!');
}

resetAdminPassword()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
