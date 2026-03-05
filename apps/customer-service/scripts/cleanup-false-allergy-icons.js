/**
 * Cleanup False Allergy Icons
 *
 * Removes "ALLERGIES" from specialRequirements for pets that have:
 * - "none" or "no" in their allergies field
 * - Empty or null allergies field
 *
 * This fixes the false positive where many pets show allergy icons
 * but don't actually have any allergies.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";

async function cleanupFalseAllergyIcons() {
  console.log("Starting cleanup of false allergy icons...\n");

  // Get all pets with ALLERGIES in specialRequirements
  const petsWithAllergyFlag = await prisma.pet.findMany({
    where: {
      tenantId: TENANT_ID,
      specialRequirements: {
        has: "ALLERGIES",
      },
    },
    select: {
      id: true,
      name: true,
      allergies: true,
      specialRequirements: true,
      owner: {
        select: {
          lastName: true,
        },
      },
    },
  });

  console.log(`Found ${petsWithAllergyFlag.length} pets with ALLERGIES flag\n`);

  let removedCount = 0;
  let keptCount = 0;
  let errorCount = 0;

  for (const pet of petsWithAllergyFlag) {
    try {
      // Clean up the allergies value - remove HTML tags, newlines, extra spaces
      let allergies = (pet.allergies || "")
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
        .replace(/\n/g, " ") // Replace newlines with space
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .toLowerCase()
        .trim();

      // Remove trailing punctuation
      allergies = allergies.replace(/[.,!?]+$/, "");

      // Check if allergies is empty, "none", "no", or other false positive values
      // Use pattern matching for more flexibility
      const isFalsePositive =
        !allergies ||
        allergies === "none" ||
        allergies === "no" ||
        allergies === "n/a" ||
        allergies === "na" ||
        allergies === "nan" ||
        allergies === "nka" ||
        allergies === "n" ||
        allergies === "unknown" ||
        allergies === "no allergies" ||
        allergies === "no known allergies" ||
        allergies === "none known" ||
        allergies === "none to-date" ||
        allergies === "no alergies" ||
        allergies === "no know allergies" ||
        allergies === "nnone" ||
        allergies === "no e" ||
        allergies === "an" ||
        allergies === "!" ||
        allergies === "mmm" ||
        allergies === "none that we are aware of" ||
        allergies === "none that we know of" ||
        allergies === "none known at this time" ||
        allergies === "not that we know of" ||
        allergies === "none at this time" ||
        allergies === "none discovered" ||
        allergies === "none known right now" ||
        allergies === "none known to owner" ||
        allergies === "n none" ||
        allergies === "neon none" ||
        allergies === "none per mom" ||
        allergies === "none per owner" ||
        allergies === "no known" ||
        allergies.startsWith("kkjg") ||
        allergies.startsWith("none that") ||
        allergies.startsWith("none known") ||
        allergies.startsWith("none at") ||
        allergies.startsWith("nka") ||
        allergies.startsWith("n/a") ||
        allergies.startsWith("none per") ||
        allergies.startsWith("no known") ||
        allergies.startsWith("no allergies") ||
        /^none[\s.]*$/.test(allergies) ||
        /^no[\s.]*$/.test(allergies) ||
        /^n\/a[\s.]*$/.test(allergies) ||
        /^no allergies[:\s;,.]/.test(allergies) ||
        /^none[\s;,.]/.test(allergies);

      if (isFalsePositive) {
        // Remove ALLERGIES from specialRequirements
        const updatedRequirements = pet.specialRequirements.filter(
          (req) => req !== "ALLERGIES"
        );

        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            specialRequirements: updatedRequirements,
          },
        });

        removedCount++;
        console.log(
          `✓ Removed allergy icon from ${pet.name} (${
            pet.owner.lastName
          }) - allergies: "${pet.allergies || "empty"}"`
        );
      } else {
        keptCount++;
        // Uncomment to see pets that actually have allergies
        // console.log(`  Kept allergy icon for ${pet.name} (${pet.owner.lastName}) - allergies: "${pet.allergies}"`);
      }
    } catch (error) {
      errorCount++;
      console.error(
        `✗ Error processing ${pet.name} (${pet.owner.lastName}):`,
        error.message
      );
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total pets with ALLERGIES flag: ${petsWithAllergyFlag.length}`);
  console.log(`Removed (false positives): ${removedCount}`);
  console.log(`Kept (actual allergies): ${keptCount}`);
  console.log(`Errors: ${errorCount}`);

  await prisma.$disconnect();
}

cleanupFalseAllergyIcons().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
