/**
 * Create Super Admin Account
 * Run this script to create the initial super admin user in production
 *
 * Usage: node scripts/create-super-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createSuperAdmin() {
  console.log('\n🔐 Create Super Admin Account\n');
  console.log(
    'This will create the initial super admin user for your production system.\n'
  );

  try {
    // Get user input
    const email = await question('Email address: ');
    const firstName = await question('First name: ');
    const lastName = await question('Last name: ');
    const password = await question('Password (min 8 characters): ');
    const confirmPassword = await question('Confirm password: ');

    // Validate input
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    // Check if super admin already exists
    const existing = await prisma.superAdmin.findUnique({
      where: { email },
    });

    if (existing) {
      console.error(`❌ Super admin with email ${email} already exists`);
      process.exit(1);
    }

    // Hash password
    console.log('\n🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create super admin
    console.log('👤 Creating super admin account...');
    const superAdmin = await prisma.superAdmin.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    console.log('\n✅ Super admin account created successfully!');
    console.log('\nAccount Details:');
    console.log(`  ID: ${superAdmin.id}`);
    console.log(`  Email: ${superAdmin.email}`);
    console.log(`  Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`  Role: ${superAdmin.role}`);
    console.log('\n🎉 You can now login at /super-admin/login\n');
  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run the script
createSuperAdmin();
