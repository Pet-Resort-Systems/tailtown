import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = 'rob@tailtownpetresort.com';
  const password = 'Tailtown2025!';
  
  try {
    // Check if super admin already exists
    const existing = await prisma.superAdmin.findUnique({
      where: { email }
    });
    
    if (existing) {
      console.log(`Super admin with email ${email} already exists`);
      return;
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create super admin
    const superAdmin = await prisma.superAdmin.create({
      data: {
        email,
        passwordHash,
        firstName: 'Rob',
        lastName: 'Weinstein',
        role: 'SUPER_ADMIN',
        isActive: true,
        require2fa: false
      }
    });
    
    console.log('Super admin created successfully:');
    console.log(`Email: ${superAdmin.email}`);
    console.log(`ID: ${superAdmin.id}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
