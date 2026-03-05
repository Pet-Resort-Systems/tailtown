#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const { parse } = require("csv-parse/sync");

const prisma = new PrismaClient();

// Map Gingr flag icons to our compatibility system
const PLAYGROUP_MAP = {
  "#8dc7a0": "LARGE_DOG", // Large Dog Playgroup
  "#c04de8": "MEDIUM_DOG", // Medium Dog PlayGroup
  "#697db0": "SMALL_DOG", // Small Dog Playgroup
  "#ff4a81": "NON_COMPATIBLE", // Non Compat
  "#d1b41e": "SENIOR_STAFF_REQUIRED", // Senior Staff
  "#f77c0a": "UNKNOWN", // Unknown Comp
};

const SPECIAL_REQUIREMENTS_MAP = {
  // Health flags
  "Has Meds": "HAS_MEDICATION",
  "Animal notes": "MEDICAL_MONITORING",
  Allergies: "ALLERGIES",
  "Heat Sensitive": "HEAT_SENSITIVE",
  "No Pool": "NO_POOL",
  "No Leash on Neck": "NO_LEASH_ON_NECK",
  Blind: "BLIND",
  Deaf: "DEAF",
  "Special Needs": "SPECIAL_NEEDS",
  "Seizure Watch": "SEIZURE_WATCH",
  "Heart Issue": "HEART_ISSUE",
  "Controlled Substance": "CONTROLLED_SUBSTANCE",
  "Needs Extra Bedding": "NEEDS_EXTRA_BEDDING",

  // Behavior flags
  "Separate to Feed": "SEPARATE_FEEDING",
  "Poop Eater": "POOP_EATER",
  "Strong Puller": "STRONG_PULLER",
  Chews: "CHEWER",
  "No Bedding": "NO_BEDDING",
  "Excessive Mounter": "EXCESSIVE_MOUNTER",
  "Loves Pool": "LOVES_POOL",
  Runner: "RUNNER",
  "No Cot": "NO_COT",
  "Excessive Drinker": "EXCESSIVE_DRINKER",

  // Aggression flags
  "Toy Aggressive": "TOY_AGGRESSIVE",
  "Leash Aggressive": "LEASH_AGGRESSIVE",
  Biter: "BITER",
  "Use Caution": "USE_CAUTION",
  "Fence Fighter": "FENCE_FIGHTER",
  "Room Aggressive": "ROOM_AGGRESSIVE",
  "Male Aggressive": "MALE_AGGRESSIVE",
  Aggression: "GENERAL_AGGRESSION",

  // Grooming flags
  "Preferred Groomer": "PREFERRED_GROOMER",
  "Grooming Notes": "GROOMING_NOTES",

  // Customer info
  "Permanent Run Card": "PERMANENT_RUN_CARD",
  Senior: "SENIOR_DISCOUNT",
  "STOP! DO NOT BOOK": "DO_NOT_BOOK",
};

async function importCompatibilityData(csvPath, tenantId) {
  console.log("\n🐾 Gingr Compatibility Import");
  console.log("═══════════════════════════════════════\n");
  console.log(`CSV File: ${csvPath}`);
  console.log(`Tenant: ${tenantId}\n`);

  const csvContent = fs.readFileSync(csvPath, "utf8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  console.log(`Parsed ${records.length} records\n`);

  const stats = {
    total: 0,
    updated: 0,
    notFound: 0,
    noIcons: 0,
    errors: [],
  };

  for (const record of records) {
    stats.total++;

    const petName = record.a_first;
    const ownerName = record.o_last;
    const iconsString = record.icons_string;

    if (!iconsString || iconsString.trim() === "") {
      stats.noIcons++;
      continue;
    }

    try {
      // Find pet by name and owner
      const pet = await findPet(tenantId, petName, ownerName);

      if (!pet) {
        stats.notFound++;
        stats.errors.push(`${petName} (${ownerName}): pet not found`);
        continue;
      }

      // Extract compatibility data from icons
      const compatibility = extractCompatibilityData(iconsString);

      // Update pet with compatibility data
      await prisma.pet.update({
        where: { id: pet.id },
        data: {
          playgroupCompatibility: compatibility.playgroupCompatibility,
          specialRequirements: compatibility.specialRequirements,
          healthFlags: compatibility.healthFlags,
          behaviorFlags: compatibility.behaviorFlags,
          aggressionFlags: compatibility.aggressionFlags,
          groomingPreferences: compatibility.groomingPreferences,
          staffRequirements: compatibility.staffRequirements,
          compatibilityNotes: compatibility.notes,
        },
      });

      stats.updated++;
      const playgroupLabel = compatibility.playgroupCompatibility || "None";
      const flagCount = compatibility.specialRequirements.length;
      console.log(`✓ ${petName} → ${playgroupLabel} (${flagCount} flags)`);
    } catch (error) {
      stats.errors.push(`${petName}: ${error.message}`);
    }
  }

  console.log(`\n📊 Import Summary`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Total rows: ${stats.total}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Not found: ${stats.notFound}`);
  console.log(`No icons: ${stats.noIcons}`);
  console.log(`Errors: ${stats.errors.length}\n`);

  if (stats.errors.length > 0) {
    console.log(`Errors:`);
    stats.errors.slice(0, 20).forEach((e) => console.log(`  - ${e}`));
    if (stats.errors.length > 20) {
      console.log(`  ... and ${stats.errors.length - 20} more`);
    }
  }

  await prisma.$disconnect();
}

function extractCompatibilityData(iconsString) {
  const result = {
    playgroupCompatibility: null,
    specialRequirements: [],
    healthFlags: [],
    behaviorFlags: [],
    aggressionFlags: [],
    groomingPreferences: {},
    staffRequirements: {},
    notes: null,
  };

  // Extract all icon elements - more flexible regex to handle Gingr's HTML format
  const iconRegex =
    /<i class="(fa[rs]?) (fa-[^"]+)"[^>]*style="color:(#[0-9a-f]{6});?"[^>]*data-original_title="([^"]+)"[^>]*(?:data-content="([^"]*)")?/gi;
  const iconMatches = [...iconsString.matchAll(iconRegex)];

  for (const match of iconMatches) {
    const iconFamily = match[1];
    const iconClass = match[2];
    const color = match[3];
    const title = match[4];
    const content = match[5];

    // Skip if iconClass is undefined
    if (!iconClass) continue;

    // Check for playgroup flag (iconClass includes extra classes like "fa-flag fa-lg has-popover")
    if (iconClass.includes("fa-flag") && PLAYGROUP_MAP[color]) {
      result.playgroupCompatibility = PLAYGROUP_MAP[color];

      if (title === "Senior Staff") {
        result.staffRequirements.seniorStaffRequired = true;
        result.staffRequirements.notes =
          content || "Requires senior staff supervision";
      }
    }

    // Map to special requirements
    const requirement = SPECIAL_REQUIREMENTS_MAP[title];
    if (requirement && !result.specialRequirements.includes(requirement)) {
      result.specialRequirements.push(requirement);
    }

    // Categorize flags
    const flagData = {
      icon: iconClass,
      color,
      title,
      content: content || "",
      category: extractCategory(iconsString, title),
    };

    if (flagData.category === "Health") {
      result.healthFlags.push(flagData);
    } else if (flagData.category === "Behavior") {
      result.behaviorFlags.push(flagData);
    } else if (flagData.category === "Aggression") {
      result.aggressionFlags.push(flagData);
    } else if (flagData.category === "Grooming") {
      if (title === "Preferred Groomer") {
        result.groomingPreferences.preferredGroomer = content;
      } else if (title === "Grooming Notes") {
        result.groomingPreferences.notes = content;
      }
      if (title.includes("SENSITIVE SKIN") || content.includes("sensitive")) {
        result.groomingPreferences.sensitiveSkin = true;
      }
    }
  }

  return result;
}

function extractCategory(iconString, title) {
  const match = iconString.match(
    new RegExp(`data-original_title="${title}"[^>]*title="[^(]+ \\(([^)]+)\\)"`)
  );
  return match ? match[1] : "Unknown";
}

async function findPet(tenantId, petName, ownerName) {
  return await prisma.pet.findFirst({
    where: {
      tenantId,
      name: { contains: petName, mode: "insensitive" },
      owner: {
        OR: [
          {
            lastName: {
              contains: ownerName.split(" ")[0],
              mode: "insensitive",
            },
          },
          {
            firstName: {
              contains: ownerName.split(" ")[0],
              mode: "insensitive",
            },
          },
        ],
      },
    },
  });
}

// CLI
const csvPath = process.argv[2];
const tenantId = process.argv[3] || "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";

if (!csvPath) {
  console.error(
    "Usage: node import-gingr-compatibility.js <csv-file> [tenant-id]"
  );
  console.error("\nExample:");
  console.error(
    "  node import-gingr-compatibility.js gingr-calendar-2025-12-16.csv"
  );
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`Error: File not found: ${csvPath}`);
  process.exit(1);
}

importCompatibilityData(csvPath, tenantId).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
