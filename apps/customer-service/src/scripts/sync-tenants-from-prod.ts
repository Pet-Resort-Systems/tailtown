import { PrismaClient } from '@prisma/client';

const localPrisma = new PrismaClient();

const prodTenants = [
  {
    id: "5ebf877f-ebb1-4744-b127-a4dbce8bf55e",
    businessName: "Joes roofing and pet stop",
    subdomain: "joepet",
    contactName: "Joe",
    contactEmail: "joe@joepet.com",
    status: "TRIAL" as const
  },
  {
    id: "e3110804-ec7c-4f7e-a3a2-e296c6d76d3a",
    businessName: "Demo Pet Resort",
    subdomain: "demo-template",
    contactName: "Demo",
    contactEmail: "demo@demo.com",
    status: "ACTIVE" as const,
    isTemplate: true
  },
  {
    id: "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05",
    businessName: "Tail Town Pet Resort",
    subdomain: "tailtown",
    contactName: "Tailtown",
    contactEmail: "admin@tailtown.com",
    status: "ACTIVE" as const,
    isProduction: true
  },
  {
    id: "6d740cdc-c616-42ef-89b4-d0e425cc7c15",
    businessName: "Brangro",
    subdomain: "brangro",
    contactName: "Brangro",
    contactEmail: "admin@brangro.com",
    status: "ACTIVE" as const
  }
];

async function syncTenants() {
  try {
    for (const tenant of prodTenants) {
      const existing = await localPrisma.tenant.findUnique({
        where: { id: tenant.id }
      });
      
      if (existing) {
        console.log(`Tenant ${tenant.subdomain} already exists, skipping`);
        continue;
      }
      
      await localPrisma.tenant.create({
        data: tenant
      });
      
      console.log(`✓ Created tenant: ${tenant.businessName} (${tenant.subdomain})`);
    }
    
    console.log('\n✅ Tenant sync complete!');
  } catch (error) {
    console.error('Error syncing tenants:', error);
  } finally {
    await localPrisma.$disconnect();
  }
}

syncTenants();
