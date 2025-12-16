/**
 * Import Pet Data from Gingr SQL Backup - BATCH VERSION
 *
 * Efficiently imports feeding notes, allergies, medications, and special requirements
 * using batch processing to avoid slow individual lookups.
 */

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";
const SQL_BACKUP_PATH =
  "/opt/tailtown/db-backup-tailtownpetresort-2025-12-16T12_54_19-07_00.sql.gz";

function cleanHtmlText(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function parseValue(value) {
  if (value === "NULL" || !value) return null;
  return value.replace(/^'|'$/g, "").replace(/\\'/g, "'");
}

async function importPetDataBatch() {
  console.log("🔍 Extracting pet data from SQL backup...\n");

  try {
    console.log("📦 Decompressing and parsing SQL backup...");
    const sqlData = execSync(
      `gunzip -c "${SQL_BACKUP_PATH}" | grep "INSERT INTO \\\`animals\\\`"`,
      {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
      }
    );

    console.log("🔍 Parsing pet data...");

    const valuesRegex = /\(([^)]+)\)/g;
    const matches = [...sqlData.matchAll(valuesRegex)];

    console.log(`Found ${matches.length} pet records in backup\n`);

    // Build a map of pet data by name
    const petDataMap = new Map();

    for (const match of matches) {
      const values = match[1];

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

      if (parts.length > 20) {
        const name = parseValue(parts[2]);
        const feedingNotes = parseValue(parts[11]);
        const medicines = parseValue(parts[16]);
        const allergies = cleanHtmlText(parseValue(parts[17]));
        const notes = cleanHtmlText(parseValue(parts[18]));
        const groomingNotes = cleanHtmlText(parseValue(parts[19]));

        if (name) {
          const key = name.toLowerCase();
          if (!petDataMap.has(key)) {
            petDataMap.set(key, []);
          }
          petDataMap.get(key).push({
            name,
            feedingNotes,
            medicines,
            allergies,
            notes,
            groomingNotes,
          });
        }
      }
    }

    console.log(`✅ Extracted data for ${petDataMap.size} unique pet names\n`);

    // Fetch ALL pets from database in one query
    console.log("📥 Loading all pets from database...");
    const allPets = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        foodNotes: true,
        medicationNotes: true,
        behaviorNotes: true,
        allergies: true,
        notes: true,
        specialRequirements: true,
      },
    });

    console.log(`Found ${allPets.length} active pets in database\n`);

    // Build update batch
    console.log("💾 Preparing updates...\n");
    const updates = [];
    let matched = 0;
    let noData = 0;

    for (const pet of allPets) {
      const key = pet.name.toLowerCase();
      const gringrData = petDataMap.get(key);

      if (!gringrData || gringrData.length === 0) {
        noData++;
        continue;
      }

      // Use first match (or could aggregate if multiple)
      const data = gringrData[0];
      const updateData = {};
      let hasChanges = false;

      if (data.feedingNotes && !pet.foodNotes) {
        updateData.foodNotes = data.feedingNotes;
        hasChanges = true;
      }

      if (
        data.medicines &&
        data.medicines.toLowerCase() !== "none" &&
        !pet.medicationNotes
      ) {
        updateData.medicationNotes = data.medicines;
        hasChanges = true;
      }

      if (
        data.allergies &&
        data.allergies.toLowerCase() !== "none" &&
        !pet.allergies
      ) {
        updateData.allergies = data.allergies;
        hasChanges = true;
      }

      if (data.notes && !pet.notes) {
        updateData.notes = data.notes;
        hasChanges = true;
      }

      if (data.groomingNotes && !pet.behaviorNotes) {
        updateData.behaviorNotes = `Grooming: ${data.groomingNotes}`;
        hasChanges = true;
      }

      // Add special requirements
      const specialReqs = new Set(pet.specialRequirements || []);
      if (data.medicines && data.medicines.toLowerCase() !== "none") {
        specialReqs.add("HAS_MEDICATION");
      }
      if (data.allergies && data.allergies.toLowerCase() !== "none") {
        specialReqs.add("ALLERGIES");
      }

      if (specialReqs.size > (pet.specialRequirements?.length || 0)) {
        updateData.specialRequirements = Array.from(specialReqs);
        hasChanges = true;
      }

      if (hasChanges) {
        updates.push({ id: pet.id, name: pet.name, data: updateData });
        matched++;
      }
    }

    console.log(`📊 Update Summary:`);
    console.log(`   Pets with matching data: ${matched}`);
    console.log(`   Pets without Gingr data: ${noData}`);
    console.log(`   Total updates to apply: ${updates.length}\n`);

    // Apply updates in batches
    console.log("⚡ Applying updates in batches...\n");
    const BATCH_SIZE = 100;
    let completed = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map((update) =>
          prisma.pet.update({
            where: { id: update.id },
            data: update.data,
          })
        )
      );

      completed += batch.length;
      console.log(`✅ Processed ${completed}/${updates.length} updates`);
    }

    // Final statistics
    const withFood = await prisma.pet.count({
      where: { tenantId: TENANT_ID, isActive: true, foodNotes: { not: null } },
    });

    const withMeds = await prisma.pet.count({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        medicationNotes: { not: null },
      },
    });

    const withAllergies = await prisma.pet.count({
      where: { tenantId: TENANT_ID, isActive: true, allergies: { not: null } },
    });

    const withSpecialReqs = await prisma.pet.count({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        specialRequirements: { isEmpty: false },
      },
    });

    console.log("\n📈 Final Database Statistics:");
    console.log(`   Total active pets: ${allPets.length}`);
    console.log(`   Pets with food notes: ${withFood}`);
    console.log(`   Pets with medication notes: ${withMeds}`);
    console.log(`   Pets with allergies: ${withAllergies}`);
    console.log(`   Pets with special requirements: ${withSpecialReqs}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importPetDataBatch()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
