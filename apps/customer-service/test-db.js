const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5433/customer'
    }
  }
})

async function main() {
  try {
    await prisma.$connect()
    console.log('Successfully connected to database')
  } catch (error) {
    console.error('Error connecting to database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
