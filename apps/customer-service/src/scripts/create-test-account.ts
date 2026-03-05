import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestAccount() {
  try {
    // Check if test account already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { email: 'test@tailtown.com' }
    });

    if (existingStaff) {
      console.log('Test account already exists');
      return;
    }

    // Create a test staff account with a known password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const staff = await prisma.staff.create({
      data: {
        email: 'test@tailtown.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '555-1234',
        role: 'ADMIN',
        isActive: true,
        password: hashedPassword,
      } as any
    });

    console.log('Test account created successfully:', {
      email: staff.email,
      password: 'password123' // Only showing this for testing purposes
    });
  } catch (error) {
    console.error('Error creating test account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccount();
