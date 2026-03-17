/**
 * Cleanup False Medication Icons
 *
 * Removes "HAS_MEDICATION" from specialRequirements for pets that don't have
 * specific medications listed. This includes:
 * - "none", "no meds", "n/a" values
 * - Empty medication notes
 * - Only feeding/administration instructions (not actual medications)
 *
 * Keeps HAS_MEDICATION for pets with actual medication names or conditions.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

// Common medication-related keywords that indicate actual medications
const MEDICATION_KEYWORDS = [
  'apoquel',
  'carprofen',
  'galliprant',
  'cosequin',
  'proin',
  'thyroid',
  'insulin',
  'benadryl',
  'probiotic',
  'antibiotic',
  'steroid',
  'allergy med',
  'blood pressure',
  'heart',
  'seizure',
  'arthritis',
  'pain',
  'anxiety',
  'trazodone',
  'gabapentin',
  'rimadyl',
  'metacam',
  'previcox',
  'onsior',
  'adequan',
  'dasuquin',
  'novox',
  'deramaxx',
  'meloxicam',
  'tramadol',
  'phenobarbital',
  'potassium bromide',
  'keppra',
  'zonisamide',
  'enalapril',
  'benazepril',
  'furosemide',
  'pimobendan',
  'vetmedin',
  'levothyroxine',
  'soloxine',
  'synthroid',
  'methimazole',
  'felimazole',
  'prednisolone',
  'prednisone',
  'dexamethasone',
  'budesonide',
  'cyclosporine',
  'atopica',
  'apoquel',
  'cytopoint',
  'cephalexin',
  'amoxicillin',
  'clavamox',
  'baytril',
  'enrofloxacin',
  'metronidazole',
  'clindamycin',
  'doxycycline',
  'simparica',
  'nexgard',
  'bravecto',
  'credelio',
  'revolution',
  'advantage',
  'heartgard',
  'interceptor',
  'sentinel',
  'trifexis',
  'cerenia',
  'ondansetron',
  'maropitant',
  'metoclopramide',
  'famotidine',
  'omeprazole',
  'sucralfate',
  'pepcid',
  'eye drop',
  'ear drop',
  'ointment',
  'cream',
  'tablet',
  'capsule',
  'injection',
  'insulin',
  'supplement',
  'vitamin',
  'joint',
  'glucosamine',
  'chondroitin',
  'omega',
  'fish oil',
];

async function cleanupFalseMedicationIcons() {
  console.log('Starting cleanup of false medication icons...\n');

  // Get all pets with HAS_MEDICATION in specialRequirements
  const petsWithFlag = await prisma.pet.findMany({
    where: {
      tenantId: TENANT_ID,
      specialRequirements: {
        has: 'HAS_MEDICATION',
      },
    },
    select: {
      id: true,
      name: true,
      medicationNotes: true,
      specialRequirements: true,
      owner: {
        select: {
          lastName: true,
        },
      },
    },
  });

  console.log(`Found ${petsWithFlag.length} pets with HAS_MEDICATION flag\n`);

  let removedCount = 0;
  let keptCount = 0;
  let errorCount = 0;

  for (const pet of petsWithFlag) {
    try {
      // Clean up the medication notes - remove HTML tags, newlines, extra spaces
      let medNotes = (pet.medicationNotes || '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/\n/g, ' ') // Replace newlines with space
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .toLowerCase()
        .trim();

      // Remove trailing punctuation
      medNotes = medNotes.replace(/[.,!?]+$/, '');

      // Check if it's a false positive (no actual medication)
      const isFalsePositive =
        !medNotes || // Empty
        medNotes === 'none' ||
        medNotes === 'no' ||
        medNotes === 'no meds' ||
        medNotes === 'no medications' ||
        medNotes === 'n/a' ||
        medNotes === 'na' ||
        medNotes === 'nan' ||
        medNotes === 'nka' ||
        medNotes === 'unknown' ||
        medNotes === 'none that we are aware of' ||
        medNotes === 'none that we know of' ||
        medNotes === 'none known' ||
        medNotes === 'not that we know of' ||
        medNotes.startsWith('none that') ||
        medNotes.startsWith('no meds') ||
        medNotes.startsWith('no medications') ||
        // Only instructions, no actual medication mentioned
        (medNotes.includes('mod feed') && !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('owner') &&
          medNotes.includes('ok') &&
          !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('pill pocket') && !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('hot dog') && !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('cheese') && !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('peanut butter') &&
          !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('use pill') && !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('with food') && !hasMedicationKeyword(medNotes)) ||
        (medNotes.includes('without food') &&
          !hasMedicationKeyword(medNotes)) ||
        // If the note is short (less than 100 chars) and contains no medication keywords, it's likely not a medication
        (medNotes.length < 100 && !hasMedicationKeyword(medNotes));

      if (isFalsePositive) {
        // Remove HAS_MEDICATION from specialRequirements
        const updatedRequirements = pet.specialRequirements.filter(
          (req) => req !== 'HAS_MEDICATION'
        );

        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            specialRequirements: updatedRequirements,
          },
        });

        removedCount++;

        // Only log first 20 and last 20
        if (removedCount <= 20 || removedCount > petsWithFlag.length - 20) {
          console.log(
            `✓ Removed medication icon from ${pet.name} (${
              pet.owner.lastName
            }) - notes: "${pet.medicationNotes?.substring(0, 60) || 'empty'}"`
          );
        } else if (removedCount === 21) {
          console.log(`... (continuing, will show last 20) ...`);
        }
      } else {
        keptCount++;
        // Uncomment to see what's being kept
        // console.log(`  Kept medication icon for ${pet.name} (${pet.owner.lastName}) - notes: "${medNotes.substring(0, 60)}"`);
      }
    } catch (error) {
      errorCount++;
      console.error(
        `✗ Error processing ${pet.name} (${pet.owner.lastName}):`,
        error.message
      );
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total pets with HAS_MEDICATION flag: ${petsWithFlag.length}`);
  console.log(`Removed (false positives): ${removedCount}`);
  console.log(`Kept (actual medications): ${keptCount}`);
  console.log(`Errors: ${errorCount}`);

  await prisma.$disconnect();
}

function hasMedicationKeyword(text) {
  return MEDICATION_KEYWORDS.some((keyword) => text.includes(keyword));
}

cleanupFalseMedicationIcons().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
