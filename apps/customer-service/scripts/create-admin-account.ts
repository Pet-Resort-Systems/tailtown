import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminAccount() {
  try {
    const tenantId = 'dev';
    const email = 'admin@tailtown.com';

    // Check if admin account already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { tenantId_email: { tenantId, email } }
    });

    if (existingStaff) {
      console.log('✅ Admin account already exists');
      console.log(`   Email: ${existingStaff.email}`);
      console.log(`   Name: ${existingStaff.firstName} ${existingStaff.lastName}`);
      console.log(`   Role: ${existingStaff.role}`);
      console.log(`   Status: ${existingStaff.isActive ? 'Active' : 'Inactive'}`);
      
      // If inactive, activate it
      if (!existingStaff.isActive) {
        console.log('\n🔧 Activating account...');
        await prisma.staff.update({
          where: { id: existingStaff.id },
          data: { isActive: true }
        });
        console.log('✅ Account activated!');
      }
      
      return;
    }

    // Create admin account with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const staff = await prisma.staff.create({
      data: {
        tenantId,
        email,
        firstName: 'Admin',
        lastName: 'User',
        phone: '555-0000',
        role: 'ADMIN',
        isActive: true,
        password: hashedPassword,
      } as any
    });

    console.log('✅ Admin account created successfully!');
    console.log('');
    console.log('📧 Email: admin@tailtown.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: ADMIN');
    console.log('🏢 Tenant: dev');
    console.log('');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminAccount();
