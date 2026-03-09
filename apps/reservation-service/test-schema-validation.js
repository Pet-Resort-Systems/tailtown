/**
 * Schema Validation Test Script
 * 
 * This script tests the enhanced schema validation functionality in schemaUtils.ts.
 * It validates the database schema against the defined schema definition and
 * generates a detailed report of any issues found.
 * 
 * Usage:
 *   node test-schema-validation.js [--auto-migrate] [--migration-path=./path/to/migrations]
 * 
 * Options:
 *   --auto-migrate     Automatically apply safe migrations if schema issues are found
 *   --migration-path   Path to save migration scripts (default: ./prisma/migrations)
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Dynamically import ESM modules
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const autoMigrate = args.includes('--auto-migrate');
    const migrationPathArg = args.find(arg => arg.startsWith('--migration-path='));
    const migrationPath = migrationPathArg 
      ? migrationPathArg.split('=')[1] 
      : path.join(__dirname, 'prisma/migrations');

    console.log('Schema Validation Test');
    console.log('=====================');
    console.log(`Auto-migrate: ${autoMigrate ? 'Enabled' : 'Disabled'}`);
    console.log(`Migration path: ${migrationPath}`);
    console.log('');

    // Initialize Prisma client
    const prisma = new PrismaClient();
    
    // Import the schema utils module (using dynamic import for ESM compatibility)
    const { validateSchema } = await import('./dist/utils/schemaUtils.js');
    
    console.log('Running schema validation...');
    
    // Run schema validation with options
    const validationResult = await validateSchema(prisma, {
      autoMigrate,
      migrationPath
    });
    
    // Display validation results
    console.log('\nValidation Results:');
    console.log('------------------');
    console.log(`Schema Valid: ${validationResult.isValid ? 'Yes' : 'No'}`);
    console.log(`Missing Tables: ${validationResult.missingTables.length}`);
    console.log(`Tables with Missing Columns: ${Object.keys(validationResult.missingColumns).length}`);
    console.log(`Tables with Missing Indexes: ${Object.keys(validationResult.missingIndexes).length}`);
    console.log(`Tables with Missing Relationships: ${Object.keys(validationResult.missingRelationships).length}`);
    
    // Display detailed report
    console.log('\nValidation Report:');
    console.log('-----------------');
    console.log(`Summary: ${validationResult.report.summary}`);
    
    if (validationResult.report.criticalIssues.length > 0) {
      console.log('\nCritical Issues:');
      validationResult.report.criticalIssues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }
    
    if (validationResult.report.warnings.length > 0) {
      console.log('\nWarnings:');
      validationResult.report.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }
    
    if (validationResult.report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      validationResult.report.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
    if (validationResult.report.migrationScript) {
      console.log('\nMigration Script Preview (first 500 chars):');
      console.log('---------------------------------------');
      console.log(validationResult.report.migrationScript.substring(0, 500) + '...');
    }
    
    await prisma.$disconnect();
    
    // Exit with appropriate code
    process.exit(validationResult.isValid ? 0 : 1);
  } catch (error) {
    console.error('Error during schema validation test:', error);
    process.exit(1);
  }
}

main();
