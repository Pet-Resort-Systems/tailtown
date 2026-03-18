#!/usr/bin/env node

/**
 * Clone Tenant Data Script
 *
 * Copies all data (customers, pets, staff, services) from one tenant to another.
 * Usage: node clone-tenant-data.ts <source-subdomain> <target-subdomain>
 * Example: node clone-tenant-data.ts demo-template rainy
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '../src/config/prisma';

async function cloneTenantData(
  sourceSubdomain: string,
  targetSubdomain: string
) {
  console.log(
    `\n📋 Cloning data from "${sourceSubdomain}" to "${targetSubdomain}"...\n`
  );

  try {
    // Get source and target tenants
    const sourceTenant = await prisma.tenant.findUnique({
      where: { subdomain: sourceSubdomain },
      select: { id: true, subdomain: true, businessName: true },
    });

    if (!sourceTenant) {
      console.error(`❌ Source tenant "${sourceSubdomain}" not found`);
      process.exit(1);
    }

    const targetTenant = await prisma.tenant.findUnique({
      where: { subdomain: targetSubdomain },
      select: { id: true, subdomain: true, businessName: true },
    });

    if (!targetTenant) {
      console.error(`❌ Target tenant "${targetSubdomain}" not found`);
      console.log(`\n💡 Create the tenant first, then run this script again.`);
      process.exit(1);
    }

    console.log(
      `📤 Source: ${sourceTenant.businessName} (${sourceTenant.subdomain})`
    );
    console.log(
      `📥 Target: ${targetTenant.businessName} (${targetTenant.subdomain})\n`
    );

    // Clear existing data in target tenant
    console.log('🧹 Clearing existing data in target tenant...');
    await prisma.pet.deleteMany({ where: { tenantId: targetTenant.id } });
    await prisma.customer.deleteMany({ where: { tenantId: targetTenant.id } });
    await prisma.staff.deleteMany({ where: { tenantId: targetTenant.id } });
    await prisma.service.deleteMany({ where: { tenantId: targetTenant.id } });
    await prisma.resource.deleteMany({ where: { tenantId: targetTenant.id } });
    await prisma.product.deleteMany({ where: { tenantId: targetTenant.id } });
    console.log('   ✓ Cleared\n');

    // Copy customers
    console.log('1️⃣  Copying customers...');
    const customers = await prisma.customer.findMany({
      where: { tenantId: sourceTenant.id },
    });

    const customerMap = new Map<string, string>();
    for (const customer of customers) {
      const { id, tenantId, createdAt, updatedAt, ...data } = customer;
      // Convert null values to undefined for Prisma
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
      ) as unknown as Prisma.CustomerUncheckedCreateInput;
      const customerData: Prisma.CustomerUncheckedCreateInput = {
        ...cleanData,
        tenantId: targetTenant.id,
      };
      const newCustomer = await prisma.customer.create({
        data: customerData,
      });
      customerMap.set(id, newCustomer.id);
    }
    console.log(`   ✓ Copied ${customers.length} customers\n`);

    // Copy pets
    console.log('2️⃣  Copying pets...');
    const pets = await prisma.pet.findMany({
      where: { tenantId: sourceTenant.id },
    });

    for (const pet of pets) {
      const { id, tenantId, customerId, createdAt, updatedAt, ...data } = pet;
      const newCustomerId = customerMap.get(customerId);
      if (newCustomerId) {
        const cleanData = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
        ) as unknown as Prisma.PetUncheckedCreateInput;
        const petData: Prisma.PetUncheckedCreateInput = {
          ...cleanData,
          tenantId: targetTenant.id,
          customerId: newCustomerId,
        };
        await prisma.pet.create({
          data: petData,
        });
      }
    }
    console.log(`   ✓ Copied ${pets.length} pets\n`);

    // Copy staff
    console.log('3️⃣  Copying staff...');
    const staff = await prisma.staff.findMany({
      where: { tenantId: sourceTenant.id },
    });

    for (const member of staff) {
      const { id, tenantId, createdAt, updatedAt, ...data } = member;
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
      ) as unknown as Prisma.StaffUncheckedCreateInput;
      const staffData: Prisma.StaffUncheckedCreateInput = {
        ...cleanData,
        tenantId: targetTenant.id,
      };
      await prisma.staff.create({
        data: staffData,
      });
    }
    console.log(`   ✓ Copied ${staff.length} staff members\n`);

    // Copy services
    console.log('4️⃣  Copying services...');
    const services = await prisma.service.findMany({
      where: { tenantId: sourceTenant.id },
    });

    for (const service of services) {
      const { id, tenantId, createdAt, updatedAt, ...data } = service;
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
      ) as unknown as Prisma.ServiceUncheckedCreateInput;
      const serviceData: Prisma.ServiceUncheckedCreateInput = {
        ...cleanData,
        tenantId: targetTenant.id,
      };
      await prisma.service.create({
        data: serviceData,
      });
    }
    console.log(`   ✓ Copied ${services.length} services\n`);

    // Copy resources (kennels/suites)
    console.log('5️⃣  Copying resources (kennels)...');
    const resources = await prisma.resource.findMany({
      where: { tenantId: sourceTenant.id },
    });

    for (const resource of resources) {
      const { id, tenantId, createdAt, updatedAt, ...data } = resource;
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
      ) as unknown as Prisma.ResourceUncheckedCreateInput;
      const resourceData: Prisma.ResourceUncheckedCreateInput = {
        ...cleanData,
        tenantId: targetTenant.id,
      };
      await prisma.resource.create({
        data: resourceData,
      });
    }
    console.log(`   ✓ Copied ${resources.length} resources\n`);

    // Copy products
    console.log('6️⃣  Copying products...');
    const products = await prisma.product.findMany({
      where: { tenantId: sourceTenant.id },
    });

    for (const product of products) {
      const { id, tenantId, createdAt, updatedAt, ...data } = product;
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
      ) as unknown as Prisma.ProductUncheckedCreateInput;
      const productData: Prisma.ProductUncheckedCreateInput = {
        ...cleanData,
        tenantId: targetTenant.id,
      };
      await prisma.product.create({
        data: productData,
      });
    }
    console.log(`   ✓ Copied ${products.length} products\n`);

    console.log('✅ Successfully cloned tenant data!');
    console.log(`\n📊 Summary:`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Pets: ${pets.length}`);
    console.log(`   Staff: ${staff.length}`);
    console.log(`   Services: ${services.length}`);
    console.log(`   Resources: ${resources.length}`);
    console.log(`   Products: ${products.length}\n`);
  } catch (error) {
    console.error('❌ Error cloning tenant data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log(
    'Usage: pnpm --filter @tailtown/customer-service exec tsx scripts/clone-tenant-data.ts <source-subdomain> <target-subdomain>'
  );
  console.log(
    'Example: pnpm --filter @tailtown/customer-service exec tsx scripts/clone-tenant-data.ts demo-template rainy'
  );
  process.exit(1);
}

const [sourceSubdomain, targetSubdomain] = args;
cloneTenantData(sourceSubdomain, targetSubdomain);
