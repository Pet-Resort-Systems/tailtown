#!/usr/bin/env node

/**
 * Import Playgroup Assignments from Gingr CSV
 *
 * Reads Gingr reservation CSV exports and updates pet playgroup compatibility
 * based on flag colors in the icons_string column:
 * - Green (#8dc7a0) = Large Dog Playgroup
 * - Blue (#697db0) = Small Dog Playgroup
 * - Purple (#c04de8) = Medium Dog Playgroup
 *
 * Usage:
 *   node import-playgroup-from-gingr-csv.js <csv-file> [tenant-id]
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Color to playgroup mapping
const COLOR_MAPPING = {
  "#8dc7a0": "LARGE_DOG", // Green flag
  "#697db0": "SMALL_DOG", // Blue flag
  "#c04de8": "MEDIUM_DOG", // Purple flag
  "#ff4a81": "NON_COMPATIBLE", // Pink/fuchsia flag - Solo play only
};

async function importPlaygroups(csvFile, tenantId) {
  console.log("🐕 Gingr Playgroup Import from CSV");
  console.log("═══════════════════════════════════════");
  console.log(`CSV File: ${csvFile}`);
  console.log(`Tenant: ${tenantId}\n`);

  const updates = [];
  const notFound = [];
  let processed = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on("data", async (row) => {
        const petId = row.a_id;
        const petName = row.a_first?.trim();
        const icons = row.icons_string || "";

        if (!petId || !petName) return;

        processed++;

        // Extract playgroup from flag color
        let playgroup = null;
        for (const [color, group] of Object.entries(COLOR_MAPPING)) {
          // Non Compat flag doesn't use "Playgroup" text, just "Non Compat"
          if (
            color === "#ff4a81" &&
            icons.includes(`color:${color}`) &&
            icons.includes("Non Compat")
          ) {
            playgroup = group;
            break;
          }
          // Other flags use "Playgroup" or "PlayGroup" text
          if (
            icons.includes(`color:${color}`) &&
            (icons.includes("Playgroup") || icons.includes("PlayGroup"))
          ) {
            playgroup = group;
            break;
          }
        }

        updates.push({ petId, petName, playgroup });
      })
      .on("end", async () => {
        console.log(`Processed ${processed} pets from CSV\n`);
        console.log("Updating database...\n");

        let updated = 0;
        let skipped = 0;

        for (const { petId, petName, playgroup } of updates) {
          try {
            // Find pet by Gingr external ID
            const pet = await prisma.pet.findFirst({
              where: {
                tenantId,
                externalId: { contains: petId },
              },
            });

            if (!pet) {
              notFound.push(`${petName} (Gingr ID: ${petId})`);
              continue;
            }

            if (!playgroup) {
              skipped++;
              continue;
            }

            // Update playgroup compatibility
            await prisma.pet.update({
              where: { id: pet.id },
              data: { playgroupCompatibility: playgroup },
            });

            updated++;
            console.log(`✓ ${petName} → ${playgroup}`);
          } catch (error) {
            console.error(`✗ Error updating ${petName}:`, error.message);
          }
        }

        console.log("\n📊 Import Summary");
        console.log("═══════════════════════════════════════");
        console.log(`Total processed: ${processed}`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped (no flag): ${skipped}`);
        console.log(`Not found: ${notFound.length}`);

        if (notFound.length > 0) {
          console.log("\nPets not found in Tailtown:");
          notFound.forEach((name) => console.log(`  - ${name}`));
        }

        await prisma.$disconnect();
        resolve();
      })
      .on("error", reject);
  });
}

// Main
const csvFile = process.argv[2];
const tenantId = process.argv[3] || "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";

if (!csvFile) {
  console.error(
    "Usage: node import-playgroup-from-gingr-csv.js <csv-file> [tenant-id]"
  );
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`Error: File not found: ${csvFile}`);
  process.exit(1);
}

importPlaygroups(csvFile, tenantId)
  .then(() => {
    console.log("\n✅ Import complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  });
