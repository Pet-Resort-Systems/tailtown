/**
 * Fix Photo Matching - Re-import photos using Gingr animal ID
 *
 * The original import matched photos by pet NAME only, causing
 * all pets with the same name to get the same photo.
 *
 * This script:
 * 1. Extracts animal ID + photo URL from SQL backup
 * 2. Matches to Tailtown pets by externalId (Gingr animal ID)
 * 3. Updates only the correct pet with the correct photo
 */

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";
const SQL_BACKUP_PATH =
  "/opt/tailtown/db-backup-tailtownpetresort-2025-12-16T12_54_19-07_00.sql.gz";

async function fixPhotoMatching() {
  console.log("🔧 Fixing photo matching - using Gingr animal ID...\n");

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

    // Build a map of Gingr animal ID -> photo URL
    const photoMap = new Map(); // gingrId -> photoUrl
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

      // Extract animal ID (1st field) and photo URL
      if (parts.length > 20) {
        const gingrId = parts[0]?.replace(/^'|'$/g, "");
        const name = parts[2]?.replace(/^'|'$/g, "").replace(/\\'/g, "'");

        // Find the photo URL field - it contains 'storage.googleapis.com'
        // Search ALL fields since commas in text fields can throw off column positions
        let photoUrl = null;
        for (let i = 0; i < parts.length; i++) {
          const field = parts[i]?.replace(/^'|'$/g, "");
          if (field && field.includes("storage.googleapis.com")) {
            photoUrl = field;
            break;
          }
        }

        if (gingrId && photoUrl) {
          // Skip placeholder images
          if (
            photoUrl.includes("c2ed8720-96f2-11ea-a7d5-ef010b7ec138") ||
            photoUrl.includes("Screen Shot 2020-05-15")
          ) {
            skippedPlaceholders++;
            continue;
          }

          photoMap.set(gingrId, { photoUrl, name });
        } else if (gingrId) {
          skippedNoPhoto++;
        }
      }
    }

    console.log(`✅ Extracted ${photoMap.size} pets with real photos`);
    console.log(`⏭️  Skipped ${skippedPlaceholders} placeholder photos`);
    console.log(`⏭️  Skipped ${skippedNoPhoto} pets without photos\n`);

    // Get all Tailtown pets with externalId
    console.log("📋 Loading Tailtown pets...");
    const tailtownPets = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        externalId: { not: null },
      },
      select: {
        id: true,
        name: true,
        externalId: true,
        profilePhoto: true,
        owner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`Found ${tailtownPets.length} Tailtown pets with externalId\n`);

    // Update photos by matching externalId
    console.log("💾 Updating photos by Gingr ID match...\n");

    let updated = 0;
    let noMatch = 0;
    let alreadyCorrect = 0;
    let changed = 0;

    for (const pet of tailtownPets) {
      const gingrData = photoMap.get(pet.externalId);

      if (!gingrData) {
        noMatch++;
        continue;
      }

      const { photoUrl } = gingrData;

      // Check if photo is already correct
      if (pet.profilePhoto === photoUrl) {
        alreadyCorrect++;
        continue;
      }

      // Update the photo
      await prisma.pet.update({
        where: { id: pet.id },
        data: { profilePhoto: photoUrl },
      });

      // Log if photo was changed (not just added)
      if (pet.profilePhoto && pet.profilePhoto !== photoUrl) {
        console.log(
          `🔄 Changed: ${pet.name} (${
            pet.owner?.lastName || "Unknown"
          }) - was wrong photo`
        );
        changed++;
      }

      updated++;
    }

    console.log("\n📊 Summary:");
    console.log(`   📸 Photos in Gingr backup: ${photoMap.size}`);
    console.log(`   🐕 Tailtown pets with externalId: ${tailtownPets.length}`);
    console.log(`   ✅ Photos updated: ${updated}`);
    console.log(`   🔄 Photos changed (were wrong): ${changed}`);
    console.log(`   ✓  Already correct: ${alreadyCorrect}`);
    console.log(`   ❌ No match in backup: ${noMatch}`);

    // Verify fix worked
    console.log("\n🔍 Verifying fix for 'Abbey' pets...");
    const abbeyPets = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        name: "Abbey",
        isActive: true,
      },
      select: {
        name: true,
        externalId: true,
        profilePhoto: true,
        owner: {
          select: { lastName: true },
        },
      },
    });

    const uniquePhotos = new Set(abbeyPets.map((p) => p.profilePhoto));
    console.log(`   Abbey pets: ${abbeyPets.length}`);
    console.log(`   Unique photos: ${uniquePhotos.size}`);

    if (uniquePhotos.size > 1 || uniquePhotos.size === abbeyPets.length) {
      console.log("   ✅ Photos are now unique per pet!");
    } else {
      console.log("   ⚠️  Some pets may still share photos");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhotoMatching();
