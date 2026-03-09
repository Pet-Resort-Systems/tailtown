/**
 * Clean Pet Data - Comprehensive Cleanup
 *
 * This script:
 * 1. Removes duplicate pet records (keeps the one with most data/most recent)
 * 2. Normalizes externalId format (removes -tailtown suffix)
 * 3. Clears all photos to prepare for clean re-import
 * 4. Clears aggression flags that may be false positives
 * 5. Re-imports photos using correct Gingr ID matching
 */

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";
const SQL_BACKUP_PATH =
  "/opt/tailtown/db-backup-tailtownpetresort-2025-12-16T12_54_19-07_00.sql.gz";

async function cleanPetData() {
  console.log("🧹 Starting comprehensive pet data cleanup...\n");

  try {
    // Step 1: Find and remove duplicates
    console.log("📋 Step 1: Finding duplicate pets...");

    const duplicates = await prisma.$queryRaw`
      SELECT name, "customerId", COUNT(*) as count
      FROM pets
      WHERE "tenantId" = ${TENANT_ID}
      GROUP BY name, "customerId"
      HAVING COUNT(*) > 1
    `;

    console.log(
      `   Found ${duplicates.length} pet name/customer combinations with duplicates\n`
    );

    let removedCount = 0;
    for (const dup of duplicates) {
      // Get all pets with this name for this customer
      const pets = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          name: dup.name,
          customerId: dup.customerId,
        },
        orderBy: [
          { updatedAt: "desc" }, // Most recently updated first
        ],
      });

      if (pets.length > 1) {
        // Keep the first one (most recently updated), delete the rest
        const toKeep = pets[0];
        const toDelete = pets.slice(1);

        for (const pet of toDelete) {
          try {
            await prisma.pet.delete({ where: { id: pet.id } });
            removedCount++;
          } catch (e) {
            // May fail if pet has reservations - just skip
            console.log(
              `   ⚠️ Could not delete ${pet.name} (${pet.id}) - may have reservations`
            );
          }
        }
      }
    }

    console.log(`   ✅ Removed ${removedCount} duplicate pet records\n`);

    // Step 2: Normalize externalId format
    console.log("📋 Step 2: Normalizing externalId format...");

    const normalized = await prisma.pet.updateMany({
      where: {
        tenantId: TENANT_ID,
        externalId: { endsWith: "-tailtown" },
      },
      data: {
        // Can't do string manipulation in updateMany, need raw query
      },
    });

    // Use raw query for string manipulation
    await prisma.$executeRaw`
      UPDATE pets
      SET "externalId" = REPLACE("externalId", '-tailtown', '')
      WHERE "tenantId" = ${TENANT_ID}
      AND "externalId" LIKE '%-tailtown'
    `;

    const afterNormalize = await prisma.pet.count({
      where: {
        tenantId: TENANT_ID,
        externalId: { endsWith: "-tailtown" },
      },
    });

    console.log(
      `   ✅ Normalized externalId format (${afterNormalize} remaining with suffix)\n`
    );

    // Step 3: Clear all photos for clean re-import
    console.log("📋 Step 3: Clearing photos for clean re-import...");

    await prisma.pet.updateMany({
      where: {
        tenantId: TENANT_ID,
      },
      data: {
        profilePhoto: null,
      },
    });

    console.log("   ✅ Cleared all photos\n");

    // Step 4: Clear aggression flags
    console.log("📋 Step 4: Clearing aggression flags...");

    await prisma.pet.updateMany({
      where: {
        tenantId: TENANT_ID,
        aggressionFlags: { isEmpty: false },
      },
      data: {
        aggressionFlags: [],
      },
    });

    console.log("   ✅ Cleared aggression flags\n");

    // Step 5: Re-import photos using Gingr ID
    console.log("📋 Step 5: Re-importing photos from Gingr backup...");

    const sqlData = execSync(
      `gunzip -c "${SQL_BACKUP_PATH}" | grep "INSERT INTO \\\`animals\\\`"`,
      {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
      }
    );

    // Build photo map by Gingr ID
    const photoMap = new Map();
    const valuesRegex = /\(([^)]+)\)/g;
    const matches = [...sqlData.matchAll(valuesRegex)];

    for (const match of matches) {
      const values = match[1];
      const parts = parseCSVLine(values);

      if (parts.length > 20) {
        const gingrId = parts[0]?.replace(/^'|'$/g, "");

        // Find photo URL
        let photoUrl = null;
        for (let i = 15; i < Math.min(parts.length, 25); i++) {
          const field = parts[i]?.replace(/^'|'$/g, "");
          if (field && field.includes("storage.googleapis.com")) {
            // Skip placeholder images
            if (
              field.includes("c2ed8720-96f2-11ea-a7d5-ef010b7ec138") ||
              field.includes("Screen Shot 2020-05-15")
            ) {
              continue;
            }
            photoUrl = field;
            break;
          }
        }

        if (gingrId && photoUrl) {
          photoMap.set(gingrId, photoUrl);
        }
      }
    }

    console.log(`   Found ${photoMap.size} photos in Gingr backup`);

    // Update pets with photos
    let photosUpdated = 0;
    const pets = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        externalId: { not: null },
      },
      select: {
        id: true,
        externalId: true,
      },
    });

    for (const pet of pets) {
      const photoUrl = photoMap.get(pet.externalId);
      if (photoUrl) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: { profilePhoto: photoUrl },
        });
        photosUpdated++;
      }
    }

    console.log(`   ✅ Updated ${photosUpdated} pets with photos\n`);

    // Final stats
    console.log("📊 Final Statistics:");
    const stats = await prisma.pet.aggregate({
      where: { tenantId: TENANT_ID },
      _count: true,
    });
    const withPhotos = await prisma.pet.count({
      where: { tenantId: TENANT_ID, profilePhoto: { not: null } },
    });
    const withPlaygroup = await prisma.pet.count({
      where: { tenantId: TENANT_ID, playgroupCompatibility: { not: null } },
    });

    console.log(`   Total pets: ${stats._count}`);
    console.log(`   With photos: ${withPhotos}`);
    console.log(`   With playgroup: ${withPlaygroup}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper to parse CSV values with proper quote handling
function parseCSVLine(line) {
  const parts = [];
  let current = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      current += char;
      continue;
    }

    if (char === "'") {
      inString = !inString;
      current += char;
      continue;
    }

    if (char === "," && !inString) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }
  if (current) parts.push(current.trim());

  return parts;
}

cleanPetData();
