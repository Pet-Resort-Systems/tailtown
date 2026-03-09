/**
 * Safe Migration Script for Advanced Scheduling Features
 * 
 * This script applies the advanced scheduling schema changes to the database
 * without wiping existing data. It uses IF NOT EXISTS clauses to be safe.
 * 
 * Usage: node scripts/apply-advanced-scheduling-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🚀 Starting Advanced Scheduling Migration...\n');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_advanced_scheduling.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('📊 Applying schema changes...\n');
    
    // Split SQL into individual statements - keep them in order
    // Remove comments first
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('COMMENT'));
    
    console.log(`📝 Executing ${statements.length} SQL statements in order...\n`);
    console.log(`First statement type: ${statements[0].substring(0, 50)}...\n`);
    
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
              error.code === '42701') {  // duplicate column
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
    console.log('  - Added grooming_skills, max_appointments_per_day, average_service_time to staff table');
    console.log('  - Created groomer_appointments table');
    console.log('  - Created groomer_preferences table');
    console.log('  - Created groomer_breaks table');
    console.log('  - Created training_classes table');
    console.log('  - Created class_sessions table');
    console.log('  - Created class_enrollments table');
    console.log('  - Created session_attendance table');
    console.log('  - Created class_waitlist table');
    console.log('  - Created all necessary indexes\n');
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    
    const tables = [
      'groomer_appointments',
      'groomer_preferences', 
      'groomer_breaks',
      'training_classes',
      'class_sessions',
      'class_enrollments',
      'session_attendance',
      'class_waitlist'
    ];
    
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table}'
        );
      `);
      
      const exists = result[0].exists;
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 Next steps:');
    console.log('  1. Create API route files');
    console.log('  2. Test the endpoints');
    console.log('  3. Build frontend interfaces\n');
    
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
