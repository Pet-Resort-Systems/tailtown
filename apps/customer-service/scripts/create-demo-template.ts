#!/usr/bin/env node

/**
 * Create Demo Template Tenant
 *
 * Creates a demo-template tenant with sample data that can be cloned
 * for testing and demonstrations.
 */

import bcrypt from 'bcrypt';
import { PetType, ServiceCategory } from '@prisma/client';
import { prisma } from '../src/config/prisma';

async function main() {
  console.log('🎨 Creating demo-template tenant...\n');

  try {
    // Check if demo-template already exists
    const existing = await prisma.tenant.findUnique({
      where: { subdomain: 'demo-template' },
    });

    if (existing) {
      console.log('⚠️  demo-template tenant already exists');
      console.log('   Cleaning up existing data...\n');

      // Delete all related data first
      await prisma.pet.deleteMany({ where: { tenantId: existing.id } });
      await prisma.customer.deleteMany({
        where: { tenantId: existing.id },
      });
      await prisma.staff.deleteMany({ where: { tenantId: existing.id } });
      await prisma.service.deleteMany({ where: { tenantId: existing.id } });
      await prisma.tenant.delete({ where: { subdomain: 'demo-template' } });

      console.log('   ✓ Cleaned up existing demo-template\n');
    }

    // Create demo-template tenant
    console.log('1️⃣  Creating tenant...');
    const tenant = await prisma.tenant.create({
      data: {
        businessName: 'Demo Pet Resort',
        subdomain: 'demo-template',
        contactName: 'Demo Admin',
        contactEmail: 'demo@example.com',
        contactPhone: '(555) 123-4567',
        address: '123 Demo Street',
        city: 'Demo City',
        state: 'CA',
        zipCode: '90210',
        status: 'ACTIVE',
        isActive: true,
        isTemplate: true, // Mark as template
        isProduction: false,
        gingrSyncEnabled: false,
        planType: 'PROFESSIONAL',
        maxEmployees: 50,
        maxLocations: 1,
      },
    });
    console.log(`   ✓ Created tenant: ${tenant.id}\n`);

    // Create sample customers
    console.log('2️⃣  Creating sample customers...');
    const customers = [];
    const customerNames = [
      {
        first: 'John',
        last: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 111-1111',
      },
      {
        first: 'Sarah',
        last: 'Johnson',
        email: 'sarah.j@example.com',
        phone: '(555) 222-2222',
      },
      {
        first: 'Michael',
        last: 'Brown',
        email: 'mbrown@example.com',
        phone: '(555) 333-3333',
      },
      {
        first: 'Emily',
        last: 'Davis',
        email: 'emily.davis@example.com',
        phone: '(555) 444-4444',
      },
      {
        first: 'David',
        last: 'Wilson',
        email: 'dwilson@example.com',
        phone: '(555) 555-5555',
      },
      {
        first: 'Lisa',
        last: 'Anderson',
        email: 'lisa.a@example.com',
        phone: '(555) 666-6666',
      },
      {
        first: 'James',
        last: 'Taylor',
        email: 'jtaylor@example.com',
        phone: '(555) 777-7777',
      },
      {
        first: 'Jennifer',
        last: 'Martinez',
        email: 'jmartinez@example.com',
        phone: '(555) 888-8888',
      },
      {
        first: 'Robert',
        last: 'Garcia',
        email: 'rgarcia@example.com',
        phone: '(555) 999-9999',
      },
      {
        first: 'Maria',
        last: 'Rodriguez',
        email: 'mrodriguez@example.com',
        phone: '(555) 000-0000',
      },
    ];

    for (const name of customerNames) {
      const customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          firstName: name.first,
          lastName: name.last,
          email: name.email,
          phone: name.phone,
          address: `${Math.floor(Math.random() * 9999)} Demo Ave`,
          city: 'Demo City',
          state: 'CA',
          zipCode: '90210',
          emergencyContact: 'Emergency Contact',
          emergencyPhone: '(555) 911-9111',
        },
      });
      customers.push(customer);
    }
    console.log(`   ✓ Created ${customers.length} customers\n`);

    // Create sample pets
    console.log('3️⃣  Creating sample pets...');
    const petData: Array<{
      name: string;
      type: PetType;
      breed: string;
      color: string;
    }> = [
      {
        name: 'Max',
        type: PetType.DOG,
        breed: 'Golden Retriever',
        color: 'Golden',
      },
      { name: 'Bella', type: PetType.DOG, breed: 'Labrador', color: 'Black' },
      {
        name: 'Charlie',
        type: PetType.DOG,
        breed: 'Beagle',
        color: 'Tri-color',
      },
      {
        name: 'Luna',
        type: PetType.DOG,
        breed: 'German Shepherd',
        color: 'Black & Tan',
      },
      { name: 'Cooper', type: PetType.DOG, breed: 'Poodle', color: 'White' },
      { name: 'Daisy', type: PetType.DOG, breed: 'Bulldog', color: 'Brindle' },
      { name: 'Rocky', type: PetType.DOG, breed: 'Boxer', color: 'Fawn' },
      {
        name: 'Sadie',
        type: PetType.DOG,
        breed: 'Husky',
        color: 'Gray & White',
      },
      {
        name: 'Tucker',
        type: PetType.DOG,
        breed: 'Corgi',
        color: 'Red & White',
      },
      { name: 'Molly', type: PetType.DOG, breed: 'Dachshund', color: 'Brown' },
      {
        name: 'Whiskers',
        type: PetType.CAT,
        breed: 'Domestic Shorthair',
        color: 'Tabby',
      },
      {
        name: 'Shadow',
        type: PetType.CAT,
        breed: 'Siamese',
        color: 'Seal Point',
      },
      {
        name: 'Mittens',
        type: PetType.CAT,
        breed: 'Maine Coon',
        color: 'Orange',
      },
      { name: 'Felix', type: PetType.CAT, breed: 'Persian', color: 'White' },
      { name: 'Cleo', type: PetType.CAT, breed: 'Bengal', color: 'Spotted' },
    ];

    let petCount = 0;
    for (let i = 0; i < petData.length; i++) {
      const customerIndex = i % customers.length;
      const pet = petData[i];

      await prisma.pet.create({
        data: {
          tenantId: tenant.id,
          customerId: customers[customerIndex].id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          color: pet.color,
          gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
          birthdate: new Date(
            2020 + Math.floor(Math.random() * 4),
            Math.floor(Math.random() * 12),
            Math.floor(Math.random() * 28)
          ),
          weight:
            pet.type === 'DOG'
              ? 30 + Math.floor(Math.random() * 40)
              : 8 + Math.floor(Math.random() * 8),
          isActive: true,
          specialNeeds: Math.random() > 0.7 ? 'Needs extra attention' : null,
          medicationNotes:
            Math.random() > 0.8 ? 'Daily medication required' : null,
          foodNotes: Math.random() > 0.8 ? 'Grain-free diet' : null,
        },
      });
      petCount++;
    }
    console.log(`   ✓ Created ${petCount} pets\n`);

    // Create sample staff
    console.log('4️⃣  Creating sample staff...');
    const staffMembers = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@demo-template.com',
        role: 'ADMIN',
      },
      {
        firstName: 'Manager',
        lastName: 'Demo',
        email: 'manager@demo-template.com',
        role: 'MANAGER',
      },
      {
        firstName: 'Staff',
        lastName: 'Member',
        email: 'staff@demo-template.com',
        role: 'STAFF',
      },
    ];

    const hashedPassword = await bcrypt.hash('Demo123!', 10);

    for (const staff of staffMembers) {
      await prisma.staff.create({
        data: {
          tenantId: tenant.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          password: hashedPassword,
          role: staff.role,
          phone: '(555) 123-4567',
          isActive: true,
        },
      });
    }
    console.log(`   ✓ Created ${staffMembers.length} staff members\n`);

    // Create sample services
    console.log('5️⃣  Creating sample services...');
    const services: Array<{
      name: string;
      category: ServiceCategory;
      price: number;
      duration: number;
    }> = [
      {
        name: 'Boarding - Standard Suite',
        category: ServiceCategory.BOARDING,
        price: 45.0,
        duration: 1440,
      },
      {
        name: 'Boarding - VIP Suite',
        category: ServiceCategory.BOARDING,
        price: 75.0,
        duration: 1440,
      },
      {
        name: 'Daycare - Full Day',
        category: ServiceCategory.DAYCARE,
        price: 35.0,
        duration: 480,
      },
      {
        name: 'Daycare - Half Day',
        category: ServiceCategory.DAYCARE,
        price: 20.0,
        duration: 240,
      },
      {
        name: 'Bath & Brush',
        category: ServiceCategory.GROOMING,
        price: 50.0,
        duration: 60,
      },
      {
        name: 'Full Groom',
        category: ServiceCategory.GROOMING,
        price: 85.0,
        duration: 120,
      },
      {
        name: 'Nail Trim',
        category: ServiceCategory.GROOMING,
        price: 15.0,
        duration: 15,
      },
      {
        name: 'Basic Obedience',
        category: ServiceCategory.TRAINING,
        price: 100.0,
        duration: 60,
      },
      {
        name: 'Puppy Training',
        category: ServiceCategory.TRAINING,
        price: 120.0,
        duration: 60,
      },
    ];

    for (const service of services) {
      await prisma.service.create({
        data: {
          tenantId: tenant.id,
          name: service.name,
          serviceCategory: service.category,
          price: service.price,
          duration: service.duration,
          isActive: true,
          taxable: true,
        },
      });
    }
    console.log(`   ✓ Created ${services.length} services\n`);

    console.log('✅ Demo template tenant created successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Subdomain: demo-template`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Pets: ${petCount}`);
    console.log(`   Staff: ${staffMembers.length}`);
    console.log(`   Services: ${services.length}`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Log in to super admin panel');
    console.log('   2. Navigate to Tenant Management');
    console.log('   3. Clone demo-template to create new test accounts\n');
  } catch (error) {
    console.error('❌ Error creating demo template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
