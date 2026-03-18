#!/usr/bin/env node

/**
 * Cleanup Duplicate Services Script
 *
 * Identifies and removes duplicate/overlapping services
 */

const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function cleanupServices() {
  console.log('\n🧹 Service Cleanup Tool\n');

  const client = new Client({
    host: 'localhost',
    port: 5433,
    database: 'customer',
    user: 'postgres',
    password: 'postgres',
  });

  await client.connect();

  try {
    // Get all services
    const result = await client.query(`
      SELECT id, name, \"serviceCategory\", price, \"externalId\", \"isActive\"
      FROM services
      WHERE \"tenantId\" = 'dev'
      ORDER BY \"serviceCategory\", name
    `);

    const services = result.rows;

    console.log(`📊 Total services: ${services.length}\n`);

    // Identify potential duplicates
    const issues = [];

    // Issue 1: Group Classes in wrong category
    const groupClasses = services.filter(
      (s) => s.name.includes('Group Class') && s.serviceCategory === 'BOARDING'
    );

    if (groupClasses.length > 0) {
      issues.push({
        type: 'wrong_category',
        title: 'Group Classes in BOARDING category',
        services: groupClasses,
        fix: 'Move to TRAINING category',
      });
    }

    // Issue 2: Overlapping boarding services
    const gingrBoarding = services.filter(
      (s) => s.name.startsWith('Boarding |') && s.externalId
    );
    const tailtownBoarding = services.filter(
      (s) =>
        !s.name.includes('|') &&
        (s.name.includes('Boarding') || s.name.includes('Suite')) &&
        !s.externalId &&
        s.serviceCategory === 'BOARDING'
    );

    if (gingrBoarding.length > 0 && tailtownBoarding.length > 0) {
      issues.push({
        type: 'overlapping',
        title: 'Overlapping Boarding Services',
        gingr: gingrBoarding,
        tailtown: tailtownBoarding,
        fix: 'Keep one set (recommend Gingr for consistency)',
      });
    }

    // Issue 3: Overlapping daycare services
    const gingrDaycare = services.filter(
      (s) => s.name.startsWith('Day Camp |') && s.externalId
    );
    const tailtownDaycare = services.filter(
      (s) => s.name.includes('Daycare') && !s.externalId
    );

    if (gingrDaycare.length > 0 && tailtownDaycare.length > 0) {
      issues.push({
        type: 'overlapping',
        title: 'Overlapping Daycare Services',
        gingr: gingrDaycare,
        tailtown: tailtownDaycare,
        fix: 'Keep one set (recommend Gingr for consistency)',
      });
    }

    // Display issues
    console.log('🔍 Issues Found:\n');

    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.title}`);
      console.log(`   Fix: ${issue.fix}\n`);

      if (issue.type === 'wrong_category') {
        console.log(`   Affected services (${issue.services.length}):`);
        issue.services.slice(0, 3).forEach((s) => {
          console.log(`   - ${s.name}`);
        });
        if (issue.services.length > 3) {
          console.log(`   ... and ${issue.services.length - 3} more`);
        }
      } else if (issue.type === 'overlapping') {
        console.log(`   Gingr services (${issue.gingr.length}):`);
        issue.gingr.slice(0, 2).forEach((s) => {
          console.log(`   🔗 ${s.name}`);
        });
        if (issue.gingr.length > 2) {
          console.log(`   ... and ${issue.gingr.length - 2} more`);
        }

        console.log(`\n   Tailtown services (${issue.tailtown.length}):`);
        issue.tailtown.forEach((s) => {
          console.log(`      ${s.name} ($${s.price})`);
        });
      }
      console.log('');
    });

    // Offer cleanup options
    console.log('\n🛠️  Cleanup Options:\n');
    console.log('1. Fix Group Class categories (move to TRAINING)');
    console.log('2. Remove Tailtown boarding services (keep Gingr)');
    console.log('3. Remove Tailtown daycare services (keep Gingr)');
    console.log('4. Do all of the above');
    console.log('5. Cancel (no changes)\n');

    const choice = await question('Select option (1-5): ');

    let fixed = 0;

    if (choice === '1' || choice === '4') {
      // Fix Group Class categories
      console.log('\n📝 Fixing Group Class categories...');
      for (const service of groupClasses) {
        await client.query(
          `
          UPDATE services
          SET "serviceCategory" = 'TRAINING'
          WHERE id = $1
        `,
          [service.id]
        );
        fixed++;
        console.log(`  ✅ ${service.name}`);
      }
    }

    if (choice === '2' || choice === '4') {
      // Remove Tailtown boarding
      console.log('\n🗑️  Removing Tailtown boarding services...');
      for (const service of tailtownBoarding) {
        await client.query(
          `
          DELETE FROM services
          WHERE id = $1
        `,
          [service.id]
        );
        fixed++;
        console.log(`  ✅ Removed: ${service.name}`);
      }
    }

    if (choice === '3' || choice === '4') {
      // Remove Tailtown daycare
      console.log('\n🗑️  Removing Tailtown daycare services...');
      for (const service of tailtownDaycare) {
        await client.query(
          `
          DELETE FROM services
          WHERE id = $1
        `,
          [service.id]
        );
        fixed++;
        console.log(`  ✅ Removed: ${service.name}`);
      }
    }

    if (choice === '5') {
      console.log('\n❌ Cancelled - no changes made');
    } else if (fixed > 0) {
      console.log(`\n✅ Fixed ${fixed} services!`);

      // Show final count
      const final = await client.query(`
        SELECT COUNT(*) as count
        FROM services
        WHERE "tenantId" = 'dev'
      `);

      console.log(`\n📊 Final service count: ${final.rows[0].count}`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.end();
    rl.close();
  }
}

cleanupServices();
