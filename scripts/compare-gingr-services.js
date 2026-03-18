#!/usr/bin/env node

/**
 * Compare Gingr Services with Tailtown Services
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function compareServices() {
  console.log('\n📊 Comparing Gingr Services with Tailtown\n');

  // Load Gingr services
  const gingrPath = path.join(
    __dirname,
    '..',
    'data',
    'gingr-reference',
    'reservationTypes.json'
  );
  const gingrServices = JSON.parse(fs.readFileSync(gingrPath, 'utf8'));

  const client = new Client({
    host: 'localhost',
    port: 5433,
    database: 'customer',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();

    // Get Tailtown services
    const result = await client.query(`
      SELECT id, name, description, "serviceCategory", price, "externalId"
      FROM services
      WHERE "tenantId" = 'dev'
      ORDER BY "serviceCategory", name
    `);

    const tailtownServices = result.rows;

    console.log('📋 Current Tailtown Services:');
    console.log(`   Total: ${tailtownServices.length} services\n`);

    const byCategory = {};
    tailtownServices.forEach((s) => {
      if (!byCategory[s.serviceCategory]) byCategory[s.serviceCategory] = [];
      byCategory[s.serviceCategory].push(s);
    });

    Object.entries(byCategory).forEach(([cat, services]) => {
      console.log(`\n${cat} (${services.length}):`);
      services.forEach((s) => {
        const hasGingrId = s.externalId ? '🔗' : '  ';
        const price = s.price > 0 ? `$${s.price}` : 'No price';
        console.log(`  ${hasGingrId} ${s.name} - ${price}`);
      });
    });

    console.log(`\n\n📦 Gingr Services Available:`);
    console.log(`   Total: ${gingrServices.length} services\n`);

    const gingrByCategory = {};
    gingrServices.forEach((s) => {
      const name = s.name || s.label;
      let cat = 'OTHER';
      if (name.includes('Boarding')) cat = 'BOARDING';
      else if (name.includes('Day Camp') || name.includes('Day Lodging'))
        cat = 'DAYCARE';
      else if (name.includes('Group Class') || name.includes('Open Group'))
        cat = 'TRAINING';
      else if (name.includes('Grooming')) cat = 'GROOMING';

      if (!gingrByCategory[cat]) gingrByCategory[cat] = [];
      gingrByCategory[cat].push(s);
    });

    Object.entries(gingrByCategory).forEach(([cat, services]) => {
      console.log(`\n${cat} (${services.length}):`);
      services.slice(0, 5).forEach((s) => {
        const name = (s.name || s.label).substring(0, 60);
        console.log(`  • ${name}`);
      });
      if (services.length > 5) {
        console.log(`  ... and ${services.length - 5} more`);
      }
    });

    // Find services with Gingr IDs
    const withGingrId = tailtownServices.filter((s) => s.externalId);
    const withoutGingrId = tailtownServices.filter((s) => !s.externalId);

    console.log(`\n\n🔗 Gingr Integration Status:`);
    console.log(`   Linked to Gingr: ${withGingrId.length} services`);
    console.log(`   Not linked: ${withoutGingrId.length} services`);

    if (withoutGingrId.length > 0) {
      console.log(`\n   Services without Gingr link:`);
      withoutGingrId.slice(0, 10).forEach((s) => {
        console.log(`     • ${s.name}`);
      });
      if (withoutGingrId.length > 10) {
        console.log(`     ... and ${withoutGingrId.length - 10} more`);
      }
    }

    console.log(`\n💡 Recommendation:`);
    if (withoutGingrId.length > 0) {
      console.log(
        `   You have ${withoutGingrId.length} services that could be linked to Gingr data.`
      );
      console.log(`   Consider updating them with Gingr descriptions and IDs.`);
    } else {
      console.log(`   All services are linked to Gingr! ✅`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

compareServices();
