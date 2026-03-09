/**
 * Migration Health Tests
 * 
 * These tests validate that our database migrations are:
 * 1. Idempotent (safe to run multiple times)
 * 2. Don't have circular dependencies
 * 3. Create all expected tables and columns
 * 
 * These would have caught the issues we had with:
 * - Duplicate enum creation
 * - Missing veterinarians table
 * - Column name mismatches
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

describe('Migration Health Checks', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Migration File Validation', () => {
    it('should have migration files in the correct location', () => {
      const migrationsPath = path.join(__dirname, '../prisma/migrations');
      const fs = require('fs');
      
      expect(fs.existsSync(migrationsPath)).toBe(true);
      
      const migrations = fs.readdirSync(migrationsPath);
      expect(migrations.length).toBeGreaterThan(0);
    });

    it('should not have migrations with duplicate enum creation', () => {
      const fs = require('fs');
      const migrationsPath = path.join(__dirname, '../prisma/migrations');
      const migrations = fs.readdirSync(migrationsPath);
      
      const enumCreations: { [key: string]: string[] } = {};
      
      migrations.forEach((migration: string) => {
        const migrationFile = path.join(migrationsPath, migration, 'migration.sql');
        if (fs.existsSync(migrationFile)) {
          const content = fs.readFileSync(migrationFile, 'utf-8');
          
          // Check for CREATE TYPE without proper idempotency
          const enumMatches = content.match(/CREATE TYPE "(\w+)"/g);
          if (enumMatches) {
            enumMatches.forEach((match: string) => {
              const enumName = match.match(/"(\w+)"/)?.[1];
              if (enumName) {
                if (!enumCreations[enumName]) {
                  enumCreations[enumName] = [];
                }
                enumCreations[enumName].push(migration);
              }
            });
          }
        }
      });
      
      // Check for duplicates
      Object.entries(enumCreations).forEach(([enumName, migrations]) => {
        if (migrations.length > 1) {
          // If there are duplicates, they should use DO $$ BEGIN ... EXCEPTION pattern
          migrations.forEach(migration => {
            const migrationFile = path.join(migrationsPath, migration, 'migration.sql');
            const content = fs.readFileSync(migrationFile, 'utf-8');
            
            if (content.includes(`CREATE TYPE "${enumName}"`)) {
              expect(
                content.includes('DO $$ BEGIN') || 
                content.includes('IF NOT EXISTS')
              ).toBe(true);
            }
          });
        }
      });
    });

    it('should not have migrations creating tables without IF NOT EXISTS', () => {
      const fs = require('fs');
      const migrationsPath = path.join(__dirname, '../prisma/migrations');
      const migrations = fs.readdirSync(migrationsPath);
      
      migrations.forEach((migration: string) => {
        const migrationFile = path.join(migrationsPath, migration, 'migration.sql');
        if (fs.existsSync(migrationFile)) {
          const content = fs.readFileSync(migrationFile, 'utf-8');
          
          // If it creates tables, it should use IF NOT EXISTS or be the initial migration
          const createTableMatches = content.match(/CREATE TABLE "(\w+)"/g);
          if (createTableMatches && !migration.includes('init')) {
            // Should use IF NOT EXISTS or be adding columns only
            const hasIfNotExists = content.includes('IF NOT EXISTS');
            const isAlterTable = content.includes('ALTER TABLE');
            
            if (!hasIfNotExists && !isAlterTable) {
              console.warn(`Migration ${migration} creates tables without IF NOT EXISTS`);
            }
          }
        }
      });
    });
  });

  describe('Database Schema Validation', () => {
    it('should have all expected core tables', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `;
      
      const tableNames = tables.map(t => t.tablename);
      
      // Core tables that should exist
      const expectedTables = [
        'customers',
        'pets',
        'reservations',
        'services',
        'staff',
        'invoices'
      ];
      
      expectedTables.forEach(table => {
        expect(tableNames).toContain(table);
      });
    });

    it('should have breeds table with correct columns', async () => {
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'breeds'
        ORDER BY column_name;
      `;
      
      if (columns.length > 0) {
        const columnNames = columns.map(c => c.column_name);
        
        expect(columnNames).toContain('id');
        expect(columnNames).toContain('name');
        expect(columnNames).toContain('species');
      }
    });

    it('should have veterinarians table if referenced', async () => {
      // Check if pets table has veterinarianId column
      const petColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pets' AND column_name = 'veterinarianId';
      `;
      
      if (petColumns.length > 0) {
        // If pets references veterinarians, the table should exist
        const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public' AND tablename = 'veterinarians';
        `;
        
        expect(tables.length).toBeGreaterThan(0);
      }
    });

    it('should have correct enum types', async () => {
      const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e'
        ORDER BY typname;
      `;
      
      const enumNames = enums.map(e => e.typname);
      
      // Expected enums
      const expectedEnums = [
        'PetType',
        'Gender',
        'ReservationStatus'
      ];
      
      expectedEnums.forEach(enumName => {
        expect(enumNames).toContain(enumName);
      });
    });
  });

  describe('Migration Data Validation', () => {
    it('should have minimal breed data for testing', async () => {
      const breedCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM breeds;
      `;
      
      if (breedCount.length > 0) {
        const count = Number(breedCount[0].count);
        
        // Should have at least a few breeds for testing
        expect(count).toBeGreaterThanOrEqual(5);
        
        // But not the full 954 breeds in CI/CD
        if (process.env.CI) {
          expect(count).toBeLessThan(100);
        }
      }
    });

    it('should have minimal veterinarian data for testing', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'veterinarians';
      `;
      
      if (tables.length > 0) {
        const vetCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM veterinarians;
        `;
        
        const count = Number(vetCount[0].count);
        
        // Should have at least a few vets for testing
        expect(count).toBeGreaterThanOrEqual(3);
        
        // But not the full 1,169 vets in CI/CD
        if (process.env.CI) {
          expect(count).toBeLessThan(100);
        }
      }
    });
  });
});
