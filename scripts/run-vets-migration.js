#!/usr/bin/env node

/**
 * Run Veterinarians Migration
 *
 * Executes the vets migration SQL using Node.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('\n🏥 Running Veterinarians Migration\n');

  // Find the migration file
  const migrationsDir = path.join(
    __dirname,
    '..',
    'services',
    'customer',
    'prisma',
    'migrations'
  );
  const migrations = fs.readdirSync(migrationsDir);
  const vetsMigration = migrations.find((m) => m.includes('add_veterinarians'));

  if (!vetsMigration) {
    console.error('❌ Error: Veterinarians migration not found');
    process.exit(1);
  }

  const migrationFile = path.join(
    migrationsDir,
    vetsMigration,
    'migration.sql'
  );
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log(`📁 Migration file: ${vetsMigration}`);
  console.log(`📊 SQL size: ${(sql.length / 1024).toFixed(2)} KB\n`);

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

    console.log('🚀 Executing migration...');
    await client.query(sql);
    console.log('✅ Migration executed successfully\n');

    // Verify vets were inserted
    const total = await client.query(`
      SELECT COUNT(*) as total 
      FROM veterinarians 
      WHERE "tenantId" = 'dev'
    `);
    console.log(`📊 Veterinarians imported: ${total.rows[0].total}\n`);

    // Show stats
    const withPhone = await client.query(`
      SELECT COUNT(*) as count 
      FROM veterinarians 
      WHERE "tenantId" = 'dev' AND phone IS NOT NULL AND phone != ''
    `);

    const withEmail = await client.query(`
      SELECT COUNT(*) as count 
      FROM veterinarians 
      WHERE "tenantId" = 'dev' AND email IS NOT NULL AND email != ''
    `);

    const withAddress = await client.query(`
      SELECT COUNT(*) as count 
      FROM veterinarians 
      WHERE "tenantId" = 'dev' AND city IS NOT NULL AND city != ''
    `);

    console.log('📈 Statistics:');
    console.log(`   With phone: ${withPhone.rows[0].count}`);
    console.log(`   With email: ${withEmail.rows[0].count}`);
    console.log(`   With address: ${withAddress.rows[0].count}\n`);

    // Show sample vets
    const sample = await client.query(`
      SELECT name, phone, city, state
      FROM veterinarians 
      WHERE "tenantId" = 'dev' 
        AND name IS NOT NULL 
        AND phone IS NOT NULL
      ORDER BY name
      LIMIT 5
    `);

    console.log('📋 Sample Veterinarians:');
    sample.rows.forEach((vet) => {
      const location =
        vet.city && vet.state
          ? `${vet.city}, ${vet.state}`
          : vet.city || vet.state || 'No location';
      console.log(`   • ${vet.name} - ${vet.phone} - ${location}`);
    });

    console.log('\n✅ Veterinarians migration complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running on port 5433');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
