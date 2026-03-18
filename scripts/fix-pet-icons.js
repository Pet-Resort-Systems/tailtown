#!/usr/bin/env node

/**
 * Fix Pet Icons Script
 *
 * Removes allergy and medication icons from pets where the field contains
 * "no", "none", "n/a", etc. instead of actual allergy/medication information.
 *
 * Usage:
 *   node scripts/fix-pet-icons.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Words that indicate NO allergies/medications
const NEGATIVE_INDICATORS = [
  'no',
  'none',
  'n/a',
  'na',
  'no allergies',
  'no medications',
];

function shouldRemoveIcon(fieldValue, iconType) {
  if (!fieldValue) return true; // Remove icon if field is empty

  const normalized = fieldValue.toLowerCase().trim();

  // Check if it's just a negative indicator
  if (NEGATIVE_INDICATORS.includes(normalized)) {
    return true;
  }

  // Check if it starts with "no " or "none "
  if (normalized.startsWith('no ') || normalized.startsWith('none ')) {
    return true;
  }

  return false;
}

async function main() {
  console.log('🔧 Pet Icons Fix Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Get all pets with icons
  const pets = await prisma.pet.findMany({
    select: {
      id: true,
      name: true,
      petIcons: true,
      allergies: true,
      medicationNotes: true,
    },
  });

  console.log(`Found ${pets.length} total pets`);
  console.log('');

  let petsUpdated = 0;
  let allergiesRemoved = 0;
  let medicationsRemoved = 0;

  for (const pet of pets) {
    if (!pet.petIcons) continue;

    const icons =
      typeof pet.petIcons === 'string'
        ? JSON.parse(pet.petIcons)
        : pet.petIcons;
    if (!Array.isArray(icons) || icons.length === 0) continue;

    let modified = false;
    let newIcons = [...icons];

    // Check allergies icon
    if (icons.includes('allergies')) {
      if (shouldRemoveIcon(pet.allergies, 'allergies')) {
        newIcons = newIcons.filter((icon) => icon !== 'allergies');
        allergiesRemoved++;
        modified = true;
        console.log(
          `  Removing allergy icon from ${pet.name} (allergies: "${pet.allergies}")`
        );
      }
    }

    // Check medication icon
    if (icons.includes('medication-required')) {
      if (shouldRemoveIcon(pet.medicationNotes, 'medication')) {
        newIcons = newIcons.filter((icon) => icon !== 'medication-required');
        medicationsRemoved++;
        modified = true;
        console.log(
          `  Removing medication icon from ${pet.name} (meds: "${pet.medicationNotes}")`
        );
      }
    }

    // Update if modified
    if (modified) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: {
          petIcons: newIcons.length > 0 ? newIcons : undefined,
        },
      });
      petsUpdated++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Pets updated: ${petsUpdated}`);
  console.log(`   🩺 Allergy icons removed: ${allergiesRemoved}`);
  console.log(`   💊 Medication icons removed: ${medicationsRemoved}`);
  console.log('');

  // Show examples of remaining icons
  const allPets = await prisma.pet.findMany({
    select: {
      name: true,
      petIcons: true,
      allergies: true,
      medicationNotes: true,
    },
  });

  const petsWithIcons = allPets.filter((p) => p.petIcons).slice(0, 5);

  if (petsWithIcons.length > 0) {
    console.log('📋 Examples of pets with icons (after fix):');
    petsWithIcons.forEach((pet) => {
      const icons =
        typeof pet.petIcons === 'string'
          ? JSON.parse(pet.petIcons)
          : pet.petIcons;
      console.log(`\n  🐕 ${pet.name}:`);
      console.log(`     Icons: ${icons.join(', ')}`);
      if (icons.includes('allergies') && pet.allergies) {
        console.log(`     Allergies: ${pet.allergies.substring(0, 100)}`);
      }
      if (icons.includes('medication-required') && pet.medicationNotes) {
        console.log(
          `     Medications: ${pet.medicationNotes.substring(0, 100)}`
        );
      }
    });
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
