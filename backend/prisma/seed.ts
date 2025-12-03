import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Admin user credentials
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@automation.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  
  // Check if admin user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
    console.log(`   User ID: ${existingUser.id}`);
    
    // Check if user has an organization
    const orgs = await prisma.organizationMember.findMany({
      where: { userId: existingUser.id },
      include: { organization: true },
    });

    if (orgs.length > 0) {
      console.log(`✅ User already has ${orgs.length} organization(s)`);
      orgs.forEach((org) => {
        console.log(`   - ${org.organization.name} (${org.role})`);
      });
      return;
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create or update admin user
  const adminUser = existingUser || await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      verified: true, // Auto-verify admin
    },
  });

  console.log('✅ Admin user created/found:');
  console.log(`   ID: ${adminUser.id}`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Name: ${adminName}`);

  // Create admin organization
  const adminOrg = await prisma.organization.create({
    data: {
      name: 'Admin Organization',
      slug: 'admin-org',
      description: 'System administrator organization with full permissions',
      members: {
        create: {
          userId: adminUser.id,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  console.log('✅ Admin organization created:');
  console.log(`   ID: ${adminOrg.id}`);
  console.log(`   Name: ${adminOrg.name}`);
  console.log(`   Slug: ${adminOrg.slug}`);
  console.log(`   Role: OWNER`);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      organizationId: adminOrg.id,
      userId: adminUser.id,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: adminOrg.id,
      metadata: {
        name: adminOrg.name,
        slug: adminOrg.slug,
        seeded: true,
      },
    },
  });

  console.log('✅ Audit log created');

  // Create sample workflow (optional)
  const sampleWorkflow = await prisma.workflow.create({
    data: {
      name: 'Sample Admin Workflow',
      description: 'A sample workflow for testing',
      organizationId: adminOrg.id,
      ownerId: adminUser.id,
      active: false,
      nodes: JSON.stringify([
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Start' },
        },
      ]),
      connections: JSON.stringify([]),
      triggers: JSON.stringify([]),
    },
  });

  console.log('✅ Sample workflow created:');
  console.log(`   ID: ${sampleWorkflow.id}`);
  console.log(`   Name: ${sampleWorkflow.name}`);

  console.log('\n================================');
  console.log('🎉 Database seeded successfully!');
  console.log('================================\n');
  console.log('📧 Admin Login Credentials:');
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role:     OWNER (Full Permissions)`);
  console.log('\n🏢 Organization:');
  console.log(`   Name: ${adminOrg.name}`);
  console.log(`   Slug: ${adminOrg.slug}`);
  console.log(`   ID:   ${adminOrg.id}`);
  console.log('\n🔗 URLs:');
  console.log('   Login:    http://localhost:5173/login');
  console.log(`   Org Settings: http://localhost:5173/organizations/${adminOrg.id}/settings`);
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
