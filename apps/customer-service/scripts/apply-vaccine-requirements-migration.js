/**
 * Safe Migration Script for Vaccine Requirements
 * 
 * Usage: node scripts/apply-vaccine-requirements-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🚀 Starting Vaccine Requirements Migration...\n');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_vaccine_requirements.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('📊 Applying schema changes...\n');
    
    // Remove comments and split into statements
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('COMMENT'))
      .join('\n');
    
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await prisma.$executeRawUnsafe(statement);
          process.stdout.write(`  ✓ Statement ${i + 1}/${statements.length}\r`);
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists') || 
              error.code === '42P07' ||  // duplicate table
              error.code === '42710' ||  // duplicate object
              error.code === '42701' ||  // duplicate column
              error.code === '23505') {  // unique violation (for inserts)
            process.stdout.write(`  ⚠ Statement ${i + 1}/${statements.length} (already exists)\r`);
          } else {
            console.log(`\n❌ Error on statement ${i + 1}:`);
            console.log(statement.substring(0, 150) + '...');
            console.log('Error:', error.message);
            throw error;
          }
        }
      }
    }
    console.log('\n');
    
    console.log('✅ Migration applied successfully!\n');
    console.log('📋 Summary of changes:');
    console.log('  - Created vaccine_requirements table');
    console.log('  - Added indexes for performance');
    console.log('  - Inserted default vaccine requirements for dogs');
    console.log('  - Inserted default vaccine requirements for cats\n');
    
    // Verify table was created
    console.log('🔍 Verifying table...');
    
    const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vaccine_requirements'
      );
    `);
    
    const exists = result[0].exists;
    console.log(`  ${exists ? '✅' : '❌'} vaccine_requirements table`);
    
    if (exists) {
      // Count default records
      const count = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM vaccine_requirements;
      `);
      console.log(`  ✅ ${count[0].count} default vaccine requirements loaded\n`);
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('💡 Next steps:');
    console.log('  1. Run: npx prisma generate');
    console.log('  2. Restart the server');
    console.log('  3. Test the endpoints\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration();
