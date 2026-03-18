#!/usr/bin/env node

/**
 * Quick fix script for Day Camp color and Check-In errors
 * Run this with: node run-fixes.js
 */

const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'postgres',
  database: 'customer',
});

async function runFixes() {
  try {
    console.log('🔧 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    // Fix 1: Update Day Camp service category
    console.log('📝 Fix 1: Updating Day Camp service category to DAYCARE...');
    const updateResult = await client.query(`
      UPDATE services 
      SET "serviceCategory" = 'DAYCARE'
      WHERE name LIKE '%Day Camp%' 
        OR name LIKE '%Daycare%'
        OR name LIKE '%Day Care%'
    `);
    console.log(`✅ Updated ${updateResult.rowCount} service(s)\n`);

    // Fix 2: Create default check-in template
    console.log('📝 Fix 2: Creating default check-in template...');
    try {
      const insertResult = await client.query(`
        INSERT INTO check_in_templates (
          id,
          "tenantId",
          name,
          description,
          "isDefault",
          "isActive",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          'dev',
          'Standard Check-In',
          'Default check-in template for all reservations',
          true,
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
        RETURNING id, name
      `);

      if (insertResult.rowCount > 0) {
        console.log(`✅ Created template: ${insertResult.rows[0].name}\n`);
      } else {
        console.log('ℹ️  Template already exists\n');
      }
    } catch (err) {
      if (err.code === '23505') {
        // Unique constraint violation
        console.log('ℹ️  Template already exists\n');
      } else {
        throw err;
      }
    }

    // Verify Fix 1
    console.log('🔍 Verifying Day Camp services:');
    const servicesResult = await client.query(`
      SELECT name, "serviceCategory" 
      FROM services 
      WHERE name LIKE '%Day Camp%'
    `);
    servicesResult.rows.forEach((row) => {
      console.log(`  - ${row.name}: ${row.serviceCategory}`);
    });
    console.log('');

    // Verify Fix 2
    console.log('🔍 Verifying Check-In templates:');
    const templatesResult = await client.query(`
      SELECT name, "isDefault", "isActive" 
      FROM check_in_templates 
      WHERE "tenantId" = 'dev'
    `);
    templatesResult.rows.forEach((row) => {
      console.log(
        `  - ${row.name} (Default: ${row.isDefault}, Active: ${row.isActive})`
      );
    });
    console.log('');

    console.log('✨ All fixes applied successfully!');
    console.log('📱 Please refresh your browser (Cmd+Shift+R)\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runFixes();
