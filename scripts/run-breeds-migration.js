#!/usr/bin/env node

/**
 * Run Breeds Migration
 *
 * Executes the breeds migration SQL using Node.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('\n🐕 Running Breeds Migration\n');

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
  const breedsMigration = migrations.find((m) => m.includes('add_breeds'));

  if (!breedsMigration) {
    console.error('❌ Error: Breeds migration not found');
    process.exit(1);
  }

  const migrationFile = path.join(
    migrationsDir,
    breedsMigration,
    'migration.sql'
  );
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log(`📁 Migration file: ${breedsMigration}`);
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

    // Verify breeds were inserted
    const result = await client.query(`
      SELECT species, COUNT(*) as count 
      FROM breeds 
      WHERE "tenantId" = 'dev'
      GROUP BY species 
      ORDER BY species
    `);

    console.log('📊 Breeds imported:');
    result.rows.forEach((row) => {
      console.log(`   ${row.species}: ${row.count} breeds`);
    });

    const total = await client.query(`
      SELECT COUNT(*) as total 
      FROM breeds 
      WHERE "tenantId" = 'dev'
    `);
    console.log(`   TOTAL: ${total.rows[0].total} breeds\n`);

    console.log('✅ Breeds migration complete!');
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
