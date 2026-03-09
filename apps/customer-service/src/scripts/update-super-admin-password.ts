import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function updatePassword() {
  const email = 'rob@tailtownpetresort.com';
  const newPassword = 'Tailtown2025!';
  
  try {
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update super admin password
    const superAdmin = await prisma.superAdmin.update({
      where: { email },
      data: { passwordHash }
    });
    
    console.log('Super admin password updated successfully:');
    console.log(`Email: ${superAdmin.email}`);
    console.log(`New Password: ${newPassword}`);
  } catch (error) {
    console.error('Error updating super admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
