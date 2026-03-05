import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createStaff() {
  const email = 'rob@tailtownpetresort.com';
  const password = 'Tailtown2015!';
  const tenantId = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05'; // Tailtown tenant
  
  try {
    // Check if staff already exists
    const existing = await prisma.staff.findFirst({
      where: { 
        email,
        tenantId 
      }
    });
    
    if (existing) {
      // Update password
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.staff.update({
        where: { id: existing.id },
        data: { password: passwordHash }
      });
      console.log('Staff password updated successfully');
    } else {
      // Create new staff
      const passwordHash = await bcrypt.hash(password, 10);
      const staff = await prisma.staff.create({
        data: {
          email,
          password: passwordHash,
          firstName: 'Rob',
          lastName: 'Weinstein',
          role: 'ADMIN',
          tenantId,
          isActive: true
        }
      });
      console.log('Staff created successfully:');
      console.log(`Email: ${staff.email}`);
      console.log(`ID: ${staff.id}`);
    }
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error creating/updating staff:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createStaff();
