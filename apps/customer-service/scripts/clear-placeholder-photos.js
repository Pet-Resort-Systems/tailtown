/**
 * Clear Placeholder Photos
 *
 * Removes the generic placeholder photo URL that Gingr assigns to pets without real photos.
 * This ensures only pets with actual unique photos show the camera icon.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";

// The generic placeholder image that Gingr uses
const PLACEHOLDER_URL =
  "c2ed8720-96f2-11ea-a7d5-ef010b7ec138-Screen Shot 2020-05-15 at 2.48.06 PM.png";

async function clearPlaceholderPhotos() {
  console.log("🧹 Clearing placeholder photos...\n");

  try {
    // Find all pets with the placeholder photo
    const petsWithPlaceholder = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        profilePhoto: {
          contains: PLACEHOLDER_URL,
        },
      },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
      },
    });

    console.log(
      `📸 Found ${petsWithPlaceholder.length} pets with placeholder photos\n`
    );

    if (petsWithPlaceholder.length > 0) {
      console.log("Sample pets with placeholders:");
      petsWithPlaceholder.slice(0, 10).forEach((pet) => {
        console.log(`  - ${pet.name}`);
      });
      console.log("");
    }

    // Clear the placeholder photos
    const result = await prisma.pet.updateMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        profilePhoto: {
          contains: PLACEHOLDER_URL,
        },
      },
      data: {
        profilePhoto: null,
      },
    });

    console.log(`✅ Cleared ${result.count} placeholder photos\n`);

    // Get final statistics
    const stats = await prisma.pet.aggregate({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        profilePhoto: {
          not: null,
        },
      },
      _count: true,
    });

    const totalPets = await prisma.pet.count({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
      },
    });

    console.log("📊 Final Statistics:");
    console.log(`   Total active pets: ${totalPets}`);
    console.log(`   Pets with real photos: ${stats._count}`);
    console.log(`   Pets without photos: ${totalPets - stats._count}`);

    // Show some examples of pets that still have photos
    const petsWithRealPhotos = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        profilePhoto: {
          not: null,
        },
      },
      select: {
        name: true,
        profilePhoto: true,
      },
      take: 10,
    });

    if (petsWithRealPhotos.length > 0) {
      console.log("\n✅ Sample pets with real photos:");
      petsWithRealPhotos.forEach((pet) => {
        const url = pet.profilePhoto.substring(
          pet.profilePhoto.lastIndexOf("/") + 1
        );
        console.log(`  - ${pet.name}: ${url.substring(0, 50)}...`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearPlaceholderPhotos()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
