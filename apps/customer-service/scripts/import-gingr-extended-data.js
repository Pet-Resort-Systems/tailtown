/**
 * Import Extended Gingr Data
 *
 * Imports additional fields from Gingr SQL backup that weren't included in initial import:
 * - VIP status
 * - Temperament
 * - Feeding schedule/method/type
 * - Veterinarian link
 * - Next vaccine date
 * - Evaluation categories and notes
 * - Incident count
 * - Created by tracking
 */

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";
const SQL_BACKUP_PATH =
  "/opt/tailtown/db-backup-tailtownpetresort-2025-12-16T12_54_19-07_00.sql.gz";

// Lookup tables for Gingr IDs (we'll extract these from the SQL)
const TEMPERAMENT_MAP = {
  1: "Aggressive",
  2: "Shy",
  3: "Playful",
  4: "Calm",
  5: "Energetic",
  6: "Friendly",
  7: "Reserved",
};

const FEEDING_SCHEDULE_MAP = {
  1: "Once daily",
  2: "Twice daily (AM/PM)",
  3: "Three times daily",
  4: "Free feed",
  5: "As needed",
  6: "Special schedule",
  7: "Controlled portions",
};

const FEEDING_METHOD_MAP = {
  1: "Regular bowl",
  2: "Slow feeder",
  3: "Hand feed",
  4: "Puzzle feeder",
  5: "Elevated bowl",
  6: "Separate feeding",
  7: "Kong/toy",
};

const FOOD_TYPE_MAP = {
  1: "Dry kibble",
  2: "Wet food",
  3: "Raw diet",
  4: "Home cooked",
  5: "Prescription diet",
  6: "Mixed (wet & dry)",
  7: "Special diet",
};

async function extractGingrData() {
  console.log("🔍 Extracting extended pet data from Gingr SQL backup...\n");

  // Extract animals table data
  const cmd = `zcat ${SQL_BACKUP_PATH} | grep 'INSERT INTO \`animals\`' | sed 's/INSERT INTO \`animals\` VALUES //g' | sed 's/;$//'`;

  const output = execSync(cmd, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  // Parse the SQL INSERT statements
  const petDataMap = new Map();

  // Split by '),(' to get individual records
  const records = output.split("),(");

  console.log(`Found ${records.length} pet records in Gingr backup\n`);

  records.forEach((record, index) => {
    try {
      // Clean up the record
      record = record.replace(/^\(/, "").replace(/\)$/, "");

      // Parse the fields - this is tricky because of embedded commas in text fields
      // We'll use a regex to match the pattern
      const match = record.match(
        /^(\d+),(\d+),'([^']+)',(\d+|NULL),(\d+),'([^']*)',([01]),(\d+|NULL),(\d+|NULL),(\d+|NULL),(\d+|NULL),'([^']*)',(\d+|NULL),(\d+|NULL),([01]),([01]),'([^']*)',/
      );

      if (!match) {
        // Try to extract at least the name for logging
        const nameMatch = record.match(/,\d+,'([^']+)'/);
        if (nameMatch && index < 10) {
          console.log(`⚠️  Could not parse record for: ${nameMatch[1]}`);
        }
        return;
      }

      const [
        _,
        id,
        ownerId,
        firstName,
        breedId,
        speciesId,
        gender,
        fixed,
        birthday,
        feedingSchedule,
        feedingMethod,
        foodType,
        feedingNotes,
        weight,
        temperament,
        vip,
        banned,
        medicines,
      ] = match;

      // Extract remaining fields from the rest of the record
      const remainingFields = record.substring(match[0].length);
      const allergyMatch = remainingFields.match(/^'([^']*)',/);
      const allergies = allergyMatch ? allergyMatch[1] : "";

      // Continue parsing for notes, grooming_notes, image, etc.
      const afterAllergies = remainingFields.substring(
        allergyMatch ? allergyMatch[0].length : 0
      );
      const notesMatch = afterAllergies.match(/^'([^']*)',/);
      const notes = notesMatch ? notesMatch[1] : "";

      const afterNotes = afterAllergies.substring(
        notesMatch ? notesMatch[0].length : 0
      );
      const groomingMatch = afterNotes.match(/^'([^']*)',/);
      const groomingNotes = groomingMatch ? groomingMatch[1] : "";

      const afterGrooming = afterNotes.substring(
        groomingMatch ? groomingMatch[0].length : 0
      );
      const imageMatch = afterGrooming.match(/^'([^']*)',/);
      const image = imageMatch ? imageMatch[1] : "";

      // Parse remaining numeric fields
      const afterImage = afterGrooming.substring(
        imageMatch ? imageMatch[0].length : 0
      );
      const numericFields = afterImage.split(",").map((f) => f.trim());

      const createdAt =
        numericFields[0] !== "NULL" ? parseInt(numericFields[0]) : null;
      const createdBy = numericFields[1] !== "NULL" ? numericFields[1] : null;
      const nextImmunization =
        numericFields[3] !== "NULL" ? parseInt(numericFields[3]) : null;
      const vetId =
        numericFields[4] !== "NULL" ? parseInt(numericFields[4]) : null;
      const checkedOutCount =
        numericFields[5] !== "NULL" ? parseInt(numericFields[5]) : 0;
      const incidentCount =
        numericFields[6] !== "NULL" ? parseInt(numericFields[6]) : 0;
      const evaluationCategories =
        numericFields[7] !== "NULL" ? numericFields[7].replace(/'/g, "") : null;
      const evaluationNotes =
        numericFields[8] !== "NULL" ? numericFields[8].replace(/'/g, "") : null;

      petDataMap.set(firstName.toLowerCase(), {
        name: firstName,
        isVip: vip === "1",
        temperament:
          temperament !== "NULL"
            ? TEMPERAMENT_MAP[parseInt(temperament)]
            : null,
        feedingSchedule:
          feedingSchedule !== "NULL"
            ? FEEDING_SCHEDULE_MAP[parseInt(feedingSchedule)]
            : null,
        feedingMethod:
          feedingMethod !== "NULL"
            ? FEEDING_METHOD_MAP[parseInt(feedingMethod)]
            : null,
        foodType:
          foodType !== "NULL" ? FOOD_TYPE_MAP[parseInt(foodType)] : null,
        nextVaccineDate: nextImmunization
          ? new Date(nextImmunization * 1000)
          : null,
        vetId: vetId,
        incidentCount: incidentCount,
        evaluationCategories: evaluationCategories,
        evaluationNotes: evaluationNotes,
        createdBy: createdBy,
      });
    } catch (error) {
      if (index < 10) {
        console.error(`Error parsing record ${index}:`, error.message);
      }
    }
  });

  console.log(`✅ Extracted data for ${petDataMap.size} unique pets\n`);
  return petDataMap;
}

async function importExtendedData() {
  console.log("📥 Starting extended Gingr data import...\n");

  const petDataMap = await extractGingrData();

  // Load all active pets from database
  console.log("📥 Loading all pets from database...");
  const allPets = await prisma.pet.findMany({
    where: {
      tenantId: TENANT_ID,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      isVip: true,
      temperament: true,
      feedingSchedule: true,
      feedingMethod: true,
      foodType: true,
      nextVaccineDate: true,
      incidentCount: true,
      evaluationCategories: true,
      evaluationNotes: true,
      createdBy: true,
    },
  });

  console.log(`Found ${allPets.length} active pets in database\n`);

  // Prepare updates
  console.log("💾 Preparing updates...\n");
  const updates = [];
  let matched = 0;
  let noData = 0;

  for (const pet of allPets) {
    const gingrData = petDataMap.get(pet.name.toLowerCase());

    if (!gingrData) {
      noData++;
      continue;
    }

    const updateData = {};
    let hasChanges = false;

    // VIP status
    if (gingrData.isVip !== pet.isVip) {
      updateData.isVip = gingrData.isVip;
      hasChanges = true;
    }

    // Temperament
    if (gingrData.temperament && !pet.temperament) {
      updateData.temperament = gingrData.temperament;
      hasChanges = true;
    }

    // Feeding schedule
    if (gingrData.feedingSchedule && !pet.feedingSchedule) {
      updateData.feedingSchedule = gingrData.feedingSchedule;
      hasChanges = true;
    }

    // Feeding method
    if (gingrData.feedingMethod && !pet.feedingMethod) {
      updateData.feedingMethod = gingrData.feedingMethod;
      hasChanges = true;
    }

    // Food type
    if (gingrData.foodType && !pet.foodType) {
      updateData.foodType = gingrData.foodType;
      hasChanges = true;
    }

    // Next vaccine date
    if (gingrData.nextVaccineDate && !pet.nextVaccineDate) {
      updateData.nextVaccineDate = gingrData.nextVaccineDate;
      hasChanges = true;
    }

    // Incident count
    if (gingrData.incidentCount > 0 && pet.incidentCount === 0) {
      updateData.incidentCount = gingrData.incidentCount;
      hasChanges = true;
    }

    // Evaluation categories
    if (gingrData.evaluationCategories && !pet.evaluationCategories) {
      updateData.evaluationCategories = gingrData.evaluationCategories;
      hasChanges = true;
    }

    // Evaluation notes
    if (gingrData.evaluationNotes && !pet.evaluationNotes) {
      updateData.evaluationNotes = gingrData.evaluationNotes;
      hasChanges = true;
    }

    // Created by
    if (gingrData.createdBy && !pet.createdBy) {
      updateData.createdBy = gingrData.createdBy;
      hasChanges = true;
    }

    if (hasChanges) {
      updates.push({ id: pet.id, name: pet.name, data: updateData });
      matched++;
    }
  }

  console.log(`📊 Update Summary:`);
  console.log(`   Pets with matching Gingr data: ${matched}`);
  console.log(`   Pets without Gingr data: ${noData}`);
  console.log(`   Total updates to apply: ${updates.length}\n`);

  if (updates.length === 0) {
    console.log("✅ No updates needed - all data already current");
    await prisma.$disconnect();
    return;
  }

  // Apply updates in batches
  console.log("⚡ Applying updates in batches...\n");
  const batchSize = 50;
  let completed = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

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

  // Get final statistics
  const stats = await prisma.pet.aggregate({
    where: {
      tenantId: TENANT_ID,
      isActive: true,
    },
    _count: {
      _all: true,
    },
  });

  const withVip = await prisma.pet.count({
    where: { tenantId: TENANT_ID, isActive: true, isVip: true },
  });

  const withTemperament = await prisma.pet.count({
    where: { tenantId: TENANT_ID, isActive: true, temperament: { not: null } },
  });

  const withFeedingSchedule = await prisma.pet.count({
    where: {
      tenantId: TENANT_ID,
      isActive: true,
      feedingSchedule: { not: null },
    },
  });

  const withIncidents = await prisma.pet.count({
    where: { tenantId: TENANT_ID, isActive: true, incidentCount: { gt: 0 } },
  });

  console.log("\n📈 Final Database Statistics:");
  console.log(`   Total active pets: ${stats._count._all}`);
  console.log(`   VIP pets: ${withVip}`);
  console.log(`   Pets with temperament: ${withTemperament}`);
  console.log(`   Pets with feeding schedule: ${withFeedingSchedule}`);
  console.log(`   Pets with incidents: ${withIncidents}`);

  await prisma.$disconnect();
  console.log("\n✅ Extended data import completed successfully");
}

importExtendedData().catch((error) => {
  console.error("❌ Import failed:", error);
  process.exit(1);
});
