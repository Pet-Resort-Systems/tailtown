import { PrismaClient, ContactMethod } from '@prisma/client';
import customerData from '../data/customer-test-data.json';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding customers...');

  for (const customer of customerData.customers) {
    const createdCustomer = await prisma.customer.create({
      data: {
        ...customer,
        preferredContact: customer.preferredContact as ContactMethod
      }
    });
    console.log(`Created customer: ${createdCustomer.firstName} ${createdCustomer.lastName} (${createdCustomer.id})`);
  }

  console.log('Seeding customers completed.');
}

main()
  .catch((e) => {
    console.error('Error seeding customers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
