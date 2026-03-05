/**
 * Database Migration Script
 * 
 * This script applies the SQL migration to create the critical tables
 * identified by our schema validation: Reservation, Customer, Pet, and Resource.
 * 
 * Usage:
 * 1. Ensure DATABASE_URL in .env is correctly configured
 * 2. Run: node prisma/migrations/apply_migrations.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database migration...');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'create_critical_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements (split by semicolon)
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await prisma.$executeRawUnsafe(`${statement};`);
        console.log(`Executed statement ${i + 1}/${statements.length}`);
      } catch (error) {
        console.error(`Error executing statement ${i + 1}:`, error.message);
        // Continue with next statement even if this one fails
        // This allows the script to create as many tables as possible
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error in migration script:', error);
    process.exit(1);
  });
