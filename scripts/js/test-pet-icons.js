const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5433/customer',
    },
  },
});

async function testPetIcons() {
  try {
    console.log('Testing pet icons functionality...\n');

    // Get first pet
    const pet = await prisma.pet.findFirst();

    if (!pet) {
      console.log('No pets found in database');
      return;
    }

    console.log('Found pet:', pet.name);
    console.log('Current petIcons:', pet.petIcons);
    console.log('Current iconNotes:', pet.iconNotes);

    // Update with test icons
    const updated = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        petIcons: ['small-group', 'medication-required', 'barker'],
        iconNotes: { 'red-flag': 'Test note for red flag' },
      },
    });

    console.log('\nUpdated pet with icons:');
    console.log('petIcons:', updated.petIcons);
    console.log('iconNotes:', updated.iconNotes);

    console.log('\n✅ Pet icons are working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPetIcons();
