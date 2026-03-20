#!/usr/bin/env node

/**
 * Import Gingr Services Script
 *
 * Imports service types from Gingr reservation data into Tailtown
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function importServices() {
  console.log('\n📋 Importing Gingr Services\n');

  // Load services data
  const servicesPath = path.join(
    __dirname,
    '..',
    'data',
    'gingr-reference',
    'reservationTypes.json'
  );
  const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));

  console.log(`Found ${services.length} services to import\n`);

  // Categorize services
  function categorizeService(name) {
    if (name.includes('Boarding')) return 'BOARDING';
    if (name.includes('Day Camp') || name.includes('Day Lodging'))
      return 'DAYCARE';
    if (name.includes('Group Class') || name.includes('Open Group'))
      return 'TRAINING';
    if (name.includes('Grooming')) return 'GROOMING';
    return 'OTHER';
  }

  // Clean HTML from description
  function cleanDescription(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Group by category
  const byCategory = {};
  services.forEach((service) => {
    const name = service.name || service.label;
    const category = categorizeService(name);
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(service);
  });

  console.log('Service Distribution:');
  Object.entries(byCategory).forEach(([cat, items]) => {
    console.log(`  ${cat}: ${items.length} services`);
  });
  console.log('');

  // Connect to database
  const client = new Client({
    host: 'localhost',
    port: 5433,
    database: 'customer',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('🚀 Importing services...\n');

    let imported = 0;
    let skipped = 0;

    for (const service of services) {
      const name = service.name || service.label;
      const category = categorizeService(name);
      const description = cleanDescription(service.description);
      const gingrId = service.id || service.value;

      try {
        // Check if service already exists
        const existing = await client.query(
          `SELECT id FROM services WHERE name = $1 AND "tenantId" = 'dev'`,
          [name]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Insert service
        await client.query(
          `
          INSERT INTO services (
            id, "tenantId", name, description, "serviceCategory", 
            price, duration, "externalId", "isActive"
          ) VALUES (
            gen_random_uuid()::text, 'dev', $1, $2, $3, 
            0.00, 60, $4, true
          )
        `,
          [name, description, category, gingrId]
        );

        imported++;
        console.log(`  ✅ ${name}`);
      } catch (err) {
        console.error(`  ❌ Error importing ${name}:`, err.message);
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   Imported: ${imported} services`);
    console.log(`   Skipped: ${skipped} (already exist)`);
    console.log(`   Total: ${services.length} services`);

    // Show breakdown by category
    console.log(`\n📈 Services by Category:`);
    const counts = await client.query(`
      SELECT "serviceCategory", COUNT(*) as count
      FROM services
      WHERE "tenantId" = 'dev'
      GROUP BY "serviceCategory"
      ORDER BY count DESC
    `);

    counts.rows.forEach((row) => {
      console.log(`   ${row.serviceCategory}: ${row.count} services`);
    });

    console.log('\n✅ Service import complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Review imported services in Admin > Services');
    console.log('   2. Set pricing for each service');
    console.log('   3. Configure service availability');
    console.log('   4. Test service selection in reservations');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importServices();
