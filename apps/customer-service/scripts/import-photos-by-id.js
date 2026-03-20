/**
 * Import Photos by Gingr ID
 *
 * Properly parses the SQL backup to extract photos and matches them
 * to Tailtown pets by their Gingr animal ID (externalId).
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';
const SQL_BACKUP_PATH =
  '/opt/tailtown/db-backup-tailtownpetresort-2025-12-16T12_54_19-07_00.sql.gz';

async function importPhotosById() {
  console.log('📸 Importing photos by Gingr ID...\n');

  try {
    // Extract the animals INSERT statements
    console.log('📦 Decompressing and parsing SQL backup...');
    const sqlData = execSync(
      `gunzip -c "${SQL_BACKUP_PATH}" | grep "INSERT INTO \\\`animals\\\`"`,
      {
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
      }
    );

    // Build photo map by Gingr ID
    // Parse each VALUES entry more carefully
    const photoMap = new Map();
    let skippedPlaceholders = 0;
    let skippedNoPhoto = 0;

    // Split by "),(" to get individual records
    // First, find the VALUES part
    const valuesStart = sqlData.indexOf('VALUES ');
    if (valuesStart === -1) {
      throw new Error('Could not find VALUES in SQL');
    }

    const valuesData = sqlData.substring(valuesStart + 7);

    // Split records - they're separated by "),("
    // But we need to handle quotes properly
    const records = [];
    let currentRecord = '';
    let inString = false;
    let depth = 0;

    for (let i = 0; i < valuesData.length; i++) {
      const char = valuesData[i];
      const prevChar = i > 0 ? valuesData[i - 1] : '';

      // Handle escape sequences
      if (char === "'" && prevChar !== '\\') {
        inString = !inString;
      }

      if (!inString) {
        if (char === '(') {
          if (depth === 0 && currentRecord.length > 0) {
            records.push(currentRecord);
            currentRecord = '';
          }
          depth++;
        } else if (char === ')') {
          depth--;
          if (depth === 0) {
            currentRecord += char;
            records.push(currentRecord);
            currentRecord = '';
            continue;
          }
        }
      }

      if (depth > 0) {
        currentRecord += char;
      }
    }

    console.log(`Found ${records.length} animal records\n`);

    // Process each record
    for (const record of records) {
      // Remove leading/trailing parens
      const cleanRecord = record.replace(/^\(|\)$/g, '');

      // Parse fields - split by comma but respect quotes
      const fields = [];
      let currentField = '';
      let inStr = false;

      for (let i = 0; i < cleanRecord.length; i++) {
        const char = cleanRecord[i];
        const prevChar = i > 0 ? cleanRecord[i - 1] : '';

        if (char === "'" && prevChar !== '\\') {
          inStr = !inStr;
          currentField += char;
        } else if (char === ',' && !inStr) {
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      if (currentField) fields.push(currentField.trim());

      // Extract Gingr ID (field 0) and find photo URL
      const gingrId = fields[0]?.replace(/^'|'$/g, '');

      // Find photo URL - search all fields
      let photoUrl = null;
      for (const field of fields) {
        const cleanField = field.replace(/^'|'$/g, '');
        if (cleanField && cleanField.includes('storage.googleapis.com')) {
          photoUrl = cleanField;
          break;
        }
      }

      if (gingrId && photoUrl) {
        // Skip placeholder images
        if (
          photoUrl.includes('c2ed8720-96f2-11ea-a7d5-ef010b7ec138') ||
          photoUrl.includes('Screen Shot 2020-05-15')
        ) {
          skippedPlaceholders++;
          continue;
        }
        photoMap.set(gingrId, photoUrl);
      } else if (gingrId) {
        skippedNoPhoto++;
      }
    }

    console.log(`✅ Extracted ${photoMap.size} pets with real photos`);
    console.log(`⏭️  Skipped ${skippedPlaceholders} placeholder photos`);
    console.log(`⏭️  Skipped ${skippedNoPhoto} pets without photos\n`);

    // Check if Matteo is in the map
    if (photoMap.has('576')) {
      console.log(
        `✓ Matteo Monroe (576) photo found: ${photoMap
          .get('576')
          .substring(0, 60)}...`
      );
    } else {
      console.log(`✗ Matteo Monroe (576) NOT found in photo map`);
    }

    // Get all Tailtown pets with externalId
    console.log('\n📋 Loading Tailtown pets...');
    const tailtownPets = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        externalId: { not: null },
      },
      select: {
        id: true,
        name: true,
        externalId: true,
        profilePhoto: true,
      },
    });

    console.log(`Found ${tailtownPets.length} Tailtown pets with externalId\n`);

    // Update photos
    console.log('💾 Updating photos...\n');
    let updated = 0;
    let alreadyCorrect = 0;
    let noMatch = 0;

    for (const pet of tailtownPets) {
      // Try both with and without -tailtown suffix
      let photoUrl = photoMap.get(pet.externalId);
      if (!photoUrl && pet.externalId.endsWith('-tailtown')) {
        photoUrl = photoMap.get(pet.externalId.replace('-tailtown', ''));
      }

      if (!photoUrl) {
        noMatch++;
        continue;
      }

      if (pet.profilePhoto === photoUrl) {
        alreadyCorrect++;
        continue;
      }

      await prisma.pet.update({
        where: { id: pet.id },
        data: { profilePhoto: photoUrl },
      });
      updated++;
    }

    console.log('📊 Summary:');
    console.log(`   📸 Photos in Gingr backup: ${photoMap.size}`);
    console.log(`   🐕 Tailtown pets: ${tailtownPets.length}`);
    console.log(`   ✅ Photos updated: ${updated}`);
    console.log(`   ✓  Already correct: ${alreadyCorrect}`);
    console.log(`   ❌ No match in backup: ${noMatch}`);

    // Verify Matteo
    const matteo = await prisma.pet.findFirst({
      where: {
        tenantId: TENANT_ID,
        externalId: '576',
      },
      select: { name: true, profilePhoto: true },
    });
    console.log(
      `\n🔍 Matteo Monroe: ${
        matteo?.profilePhoto ? 'HAS PHOTO ✅' : 'NO PHOTO ❌'
      }`
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

importPhotosById();
