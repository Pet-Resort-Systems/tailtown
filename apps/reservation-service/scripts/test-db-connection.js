/**
 * Database Connection Test Script
 * 
 * This script tests the database connection using the DATABASE_URL from .env
 * It helps diagnose connection issues before attempting migrations or running the service
 * 
 * Usage:
 * node scripts/test-db-connection.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Get the DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not defined in the .env file');
  console.log('Please ensure your .env file contains a valid DATABASE_URL');
  process.exit(1);
}

// Parse the database URL to extract components
function parseDatabaseUrl(url) {
  try {
    // Extract protocol, credentials, host, port, and database name
    const regex = /^(postgresql):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = url.match(regex);
    
    if (!match) {
      return {
        valid: false,
        error: 'Invalid DATABASE_URL format'
      };
    }
    
    return {
      valid: true,
      protocol: match[1],
      username: match[2],
      password: match[3],
      host: match[4],
      port: match[5],
      database: match[6],
      url: url
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to parse DATABASE_URL: ${error.message}`
    };
  }
}

// Test the database connection
async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  // Parse the DATABASE_URL
  const dbConfig = parseDatabaseUrl(databaseUrl);
  
  if (!dbConfig.valid) {
    console.error(`❌ ${dbConfig.error}`);
    console.log('Expected format: postgresql://username:password@host:port/database');
    return false;
  }
  
  // Print the connection details (masking password)
  console.log('Connection details:');
  console.log(`  Protocol: ${dbConfig.protocol}`);
  console.log(`  Host:     ${dbConfig.host}`);
  console.log(`  Port:     ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  Username: ${dbConfig.username}`);
  console.log(`  Password: ${'*'.repeat(dbConfig.password.length)}`);
  
  // Create a Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Try to connect and run a simple query
    console.log('Attempting to connect to the database...');
    
    // Execute a simple query to test the connection
    const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
    
    console.log('✅ Successfully connected to the database!');
    
    // Check if we can query the information_schema
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        LIMIT 5
      `;
      
      if (tables.length > 0) {
        console.log('✅ Successfully queried database schema');
        console.log('Sample tables in the database:');
        tables.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      } else {
        console.log('ℹ️ No tables found in the public schema');
      }
    } catch (error) {
      console.warn('⚠️ Could not query database schema:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to the database');
    console.error(`Error: ${error.message}`);
    
    // Provide helpful suggestions based on the error
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nPossible causes:');
      console.log('1. PostgreSQL server is not running');
      console.log('2. Incorrect host or port in DATABASE_URL');
      console.log('\nSuggested actions:');
      console.log('- Verify PostgreSQL is running');
      console.log('- Check host and port in .env file');
    } else if (error.message.includes('authentication failed')) {
      console.log('\nPossible causes:');
      console.log('1. Incorrect username or password');
      console.log('2. User does not have access to the database');
      console.log('\nSuggested actions:');
      console.log('- Verify username and password in DATABASE_URL');
      console.log('- Ensure the user has appropriate permissions');
    } else if (error.message.includes('does not exist')) {
      console.log('\nPossible causes:');
      console.log('1. Database does not exist');
      console.log('\nSuggested actions:');
      console.log('- Create the database using:');
      console.log(`  CREATE DATABASE ${dbConfig.database};`);
    }
    
    return false;
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ Database connection test completed successfully');
      console.log('You can now run migrations or start the service');
    } else {
      console.log('\n❌ Database connection test failed');
      console.log('Please fix the connection issues before proceeding');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
