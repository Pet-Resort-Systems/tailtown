/**
 * Import Pet Photos from Gingr SQL Backup
 *
 * Extracts pet names and photo URLs from the SQL backup file
 * and updates the Tailtown database.
 */

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const fs = require("fs");

const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";
const SQL_BACKUP_PATH =
  "/Users/robweinstein/CascadeProjects/tailtown/db-backup-tailtownpetresort-2025-12-16T12_54_19-07_00.sql.gz";

async function extractPhotosFromSQLBackup() {
  console.log("🔍 Extracting pet photos from SQL backup...\n");

  try {
    // Extract the animals INSERT statements
    console.log("📦 Decompressing and parsing SQL backup...");
    const sqlData = execSync(
      `gunzip -c "${SQL_BACKUP_PATH}" | grep "INSERT INTO \\\`animals\\\`"`,
      {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      }
    );

    // Parse the INSERT statements to extract pet data
    console.log("🔍 Parsing pet data...");

    // Match all VALUES entries
    const valuesRegex = /\(([^)]+)\)/g;
    const matches = [...sqlData.matchAll(valuesRegex)];

    console.log(`Found ${matches.length} pet records in backup\n`);

    const petPhotos = [];
    let skippedPlaceholders = 0;
    let skippedNoPhoto = 0;

    for (const match of matches) {
      const values = match[1];

      // Split by comma, but be careful with commas inside strings
      const parts = [];
      let current = "";
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < values.length; i++) {
        const char = values[i];

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

      // Extract pet name (3rd field) and photo URL (typically around field 20-21)
      if (parts.length > 20) {
        const name = parts[2]?.replace(/^'|'$/g, "").replace(/\\'/g, "'");

        // Find the photo URL field - it contains 'storage.googleapis.com'
        let photoUrl = null;
        for (let i = 15; i < Math.min(parts.length, 25); i++) {
          const field = parts[i]?.replace(/^'|'$/g, "");
          if (field && field.includes("storage.googleapis.com")) {
            photoUrl = field;
            break;
          }
        }

        if (name && photoUrl) {
          // Skip placeholder images
          if (
            photoUrl.includes("c2ed8720-96f2-11ea-a7d5-ef010b7ec138") ||
            photoUrl.includes("Screen Shot 2020-05-15")
          ) {
            skippedPlaceholders++;
            continue;
          }

          petPhotos.push({ name, photoUrl });
        } else if (name) {
          skippedNoPhoto++;
        }
      }
    }

    console.log(`✅ Extracted ${petPhotos.length} pets with real photos`);
    console.log(`⏭️  Skipped ${skippedPlaceholders} placeholder photos`);
    console.log(`⏭️  Skipped ${skippedNoPhoto} pets without photos\n`);

    // Show sample
    console.log("Sample pets with photos:");
    petPhotos.slice(0, 10).forEach((pet) => {
      const shortUrl = pet.photoUrl.substring(
        pet.photoUrl.lastIndexOf("/") + 1,
        pet.photoUrl.lastIndexOf("/") + 40
      );
      console.log(`  - ${pet.name}: ${shortUrl}...`);
    });
    console.log("");

    // Update database
    console.log("💾 Updating database...\n");

    let updated = 0;
    let notFound = 0;
    let alreadyHasPhoto = 0;

    for (const { name, photoUrl } of petPhotos) {
      // Find matching pets in Tailtown
      const pets = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          name: { equals: name, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          profilePhoto: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (pets.length === 0) {
        notFound++;
        continue;
      }

      for (const pet of pets) {
        // Skip if already has a real photo
        if (
          pet.profilePhoto &&
          !pet.profilePhoto.includes("ajax-loader") &&
          (pet.profilePhoto.includes("googleapis.com") ||
            pet.profilePhoto.includes("amazonaws.com"))
        ) {
          alreadyHasPhoto++;
          continue;
        }

        await prisma.pet.update({
          where: { id: pet.id },
          data: { profilePhoto: photoUrl },
        });

        console.log(
          `✅ ${pet.name} (${pet.owner.firstName} ${pet.owner.lastName})`
        );
        updated++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   📸 Pets with photos in backup: ${petPhotos.length}`);
    console.log(`   ✅ Database records updated: ${updated}`);
    console.log(`   ⏭️  Already had photos: ${alreadyHasPhoto}`);
    console.log(`   ❌ Pets not found in Tailtown: ${notFound}`);

    // Final statistics
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

    console.log("\n📈 Final Database Statistics:");
    console.log(`   Total active pets: ${totalPets}`);
    console.log(`   Pets with photos: ${stats._count}`);
    console.log(`   Pets without photos: ${totalPets - stats._count}`);
    console.log(
      `   Photo coverage: ${((stats._count / totalPets) * 100).toFixed(1)}%`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
extractPhotosFromSQLBackup()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
