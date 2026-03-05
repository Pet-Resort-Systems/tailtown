import { PrismaClient, PetType, Gender } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create some test customers
  const customer1 = await prisma.customer.create({
    data: {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '555-0123',
      address: '123 Main St',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      pets: {
        create: [
          {
            name: 'Max',
            type: PetType.DOG,
            breed: 'Golden Retriever',
            gender: Gender.MALE,
            birthdate: new Date('2022-01-15'),
            weight: 65.5,
            isNeutered: true,
            vetName: 'Dr. Smith',
            vetPhone: '555-9876'
          },
          {
            name: 'Luna',
            type: PetType.CAT,
            breed: 'Siamese',
            gender: Gender.FEMALE,
            birthdate: new Date('2021-06-20'),
            weight: 8.2,
            isNeutered: true,
            vetName: 'Dr. Smith',
            vetPhone: '555-9876'
          }
        ]
      }
    }
  })

  const customer2 = await prisma.customer.create({
    data: {
      email: 'sarah.wilson@example.com',
      firstName: 'Sarah',
      lastName: 'Wilson',
      phone: '555-4567',
      address: '456 Oak Ave',
      city: 'Denver',
      state: 'CO',
      zipCode: '80205',
      pets: {
        create: [
          {
            name: 'Rocky',
            type: PetType.DOG,
            breed: 'German Shepherd',
            gender: Gender.MALE,
            birthdate: new Date('2023-03-10'),
            weight: 75.0,
            isNeutered: false,
            vetName: 'Dr. Johnson',
            vetPhone: '555-5432'
          }
        ]
      }
    }
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
