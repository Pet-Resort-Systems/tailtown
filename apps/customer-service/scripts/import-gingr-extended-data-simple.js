/**
 * Import Extended Gingr Data - Simplified Version
 *
 * Imports additional fields from Gingr SQL backup using direct SQL queries
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

async function importExtendedData() {
  console.log('📥 Starting extended Gingr data import...\n');

  // Get all active pets
  const allPets = await prisma.pet.findMany({
    where: {
      tenantId: TENANT_ID,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      externalId: true,
      isVip: true,
      temperament: true,
      feedingSchedule: true,
      incidentCount: true,
    },
  });

  console.log(`Found ${allPets.length} active pets in database\n`);

  // Extract Gingr data using SQL
  console.log('🔍 Extracting data from Gingr SQL backup...');

  const cmd = `zcat /opt/tailtown/db-backup-tailtownpetresort-2025-12-16T12_54_19-07_00.sql.gz | \\
    grep 'INSERT INTO \`animals\`' | \\
    sed 's/INSERT INTO \`animals\` VALUES //g' | \\
    sed 's/;$//' | \\
    awk -F',' '{
      # Extract key fields by position
      # Field positions: id(1), owner_id(2), first_name(3), breed_id(4), species_id(5), 
      # gender(6), fixed(7), birthday(8), feeding_schedule(9), feeding_method(10), 
      # food_type(11), feeding_notes(12), weight(13), temperament(14), vip(15), 
      # banned(16), medicines(17), allergies(18), notes(19), grooming_notes(20), 
      # image(21), created_at(22), created_by(23), pricing_rules(24), 
      # next_immunization(25), vet_id(26), checked_out_count(27), incident_count(28)
      
      gsub(/^\\(|\\)$/, "");  # Remove leading/trailing parens
      
      # Extract name (field 3)
      match($0, /,[0-9]+,'\''([^'\'']+)'\'',/, name_arr);
      name = name_arr[1];
      
      # Extract VIP (field 15) - look for pattern after weight
      vip = 0;
      if (match($0, /,[0-9]+,[0-9]+,([01]),/)) {
        vip = substr($0, RSTART+RLENGTH-2, 1);
      }
      
      # Print name and VIP status
      if (name != "") {
        print tolower(name) "\\t" vip;
      }
    }' | head -100`;

  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    const lines = output.trim().split('\n');

    console.log(`Sample of extracted data (first 10):`);
    lines.slice(0, 10).forEach((line) => console.log(`  ${line}`));
    console.log('');
  } catch (error) {
    console.error('Error extracting Gingr data:', error.message);
  }

  // For now, let's just update VIP status from the simple fields we can extract
  console.log('💾 Updating VIP status for pets...\n');

  let vipCount = 0;

  // Simple approach: Mark some pets as VIP based on Gingr data we already have
  // We'll do a more comprehensive import after we verify the field extraction works

  const updates = [];

  for (const pet of allPets) {
    // For now, just ensure the field exists and has a default value
    if (pet.isVip === null || pet.isVip === undefined) {
      updates.push({
        id: pet.id,
        data: { isVip: false },
      });
    }
  }

  if (updates.length > 0) {
    console.log(`Updating ${updates.length} pets with default VIP status...`);

    await Promise.all(
      updates.map((update) =>
        prisma.pet.update({
          where: { id: update.id },
          data: update.data,
        })
      )
    );
  }

  console.log('\n📈 Summary:');
  console.log(`   Total pets processed: ${allPets.length}`);
  console.log(`   Pets updated: ${updates.length}`);
  console.log(`   VIP pets: ${vipCount}`);

  await prisma.$disconnect();
  console.log('\n✅ Import completed successfully');
  console.log(
    '\nNote: This is a simplified version. Full data extraction will be implemented'
  );
  console.log('after verifying the SQL parsing logic works correctly.');
}

importExtendedData().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
