#!/usr/bin/env node
/**
 * Full Gingr Sync Script
 * 
 * Performs a complete sync of all data from Gingr:
 * - Customers (owners)
 * - Pets (animals) 
 * - Reservations (last 30 days to next 90 days)
 * - Invoices
 * 
 * This is designed to run nightly to keep customer/pet data in sync.
 * For hourly reservation updates, use incremental-gingr-sync.js instead.
 * 
 * Usage:
 *   node full-gingr-sync.js [tenantId]
 * 
 * Example:
 *   node full-gingr-sync.js b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
 */

const { PrismaClient } = require('@prisma/client');
const { GingrSyncService } = require('../dist/services/gingr-sync.service');

const prisma = new PrismaClient();

/**
 * Main sync function
 */
async function fullSync(tenantId) {
  console.log('🌙 Starting Nightly Full Gingr Sync');
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(`   Mountain Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    
    if (!tenant.gingrSyncEnabled) {
      console.log('⚠️  Gingr sync is disabled for this tenant');
      return {
        success: false,
        error: 'Gingr sync disabled'
      };
    }
    
    console.log(`📋 Syncing: ${tenant.businessName} (${tenant.subdomain})`);
    console.log('');
    
    // Run the sync
    const syncService = new GingrSyncService();
    const result = await syncService.syncTenant(tenantId);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (result.success) {
      console.log('');
      console.log('✅ Full sync complete!');
      console.log(`   Duration: ${duration}s`);
      console.log(`   Customers: ${result.customersSync}`);
      console.log(`   Pets: ${result.petsSync}`);
      console.log(`   Reservations: ${result.reservationsSync}`);
      console.log(`   Invoices: ${result.invoicesSync}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(err => {
          console.log(`     - ${err}`);
        });
      }
    } else {
      console.error('');
      console.error('❌ Sync failed');
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => {
          console.error(`   - ${err}`);
        });
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('');
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Sync all enabled tenants
 */
async function syncAllEnabledTenants() {
  console.log('🌙 Nightly Full Gingr Sync - All Tenants');
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(`   Mountain Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}`);
  console.log('');
  
  const tenants = await prisma.tenant.findMany({
    where: {
      gingrSyncEnabled: true,
      isActive: true,
      status: 'ACTIVE'
    }
  });
  
  console.log(`Found ${tenants.length} enabled tenants\n`);
  
  const results = [];
  
  for (const tenant of tenants) {
    console.log('='.repeat(60));
    console.log(`Syncing: ${tenant.businessName} (${tenant.subdomain})`);
    console.log('='.repeat(60));
    
    const result = await fullSync(tenant.id);
    results.push({
      tenantId: tenant.id,
      businessName: tenant.businessName,
      ...result
    });
    
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('NIGHTLY SYNC SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.businessName}:`);
    if (r.success) {
      console.log(`   Customers: ${r.customersSync}, Pets: ${r.petsSync}, Reservations: ${r.reservationsSync}`);
    } else {
      console.log(`   Error: ${r.error}`);
    }
  });
  
  await prisma.$disconnect();
}

// Run the script
if (require.main === module) {
  const tenantId = process.argv[2];
  
  if (tenantId) {
    // Sync specific tenant
    fullSync(tenantId)
      .then(result => {
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    // Sync all enabled tenants
    syncAllEnabledTenants()
      .then(() => {
        process.exit(0);
      })
      .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}

module.exports = { fullSync, syncAllEnabledTenants };
