/**
 * Dependency Health Tests
 * 
 * These tests validate that all required dependencies are installed
 * and can be imported correctly.
 * 
 * These would have caught:
 * - Missing helmet package
 * - Missing morgan package
 * - Missing @types packages
 */

describe('Dependency Health Checks', () => {
  describe('Required Runtime Dependencies', () => {
    it('should have express installed', () => {
      expect(() => require('express')).not.toThrow();
    });

    it('should have @prisma/client installed', () => {
      expect(() => require('@prisma/client')).not.toThrow();
    });

    it('should have helmet installed', () => {
      expect(() => require('helmet')).not.toThrow();
    });

    it('should have morgan installed', () => {
      expect(() => require('morgan')).not.toThrow();
    });

    it('should have cors installed', () => {
      expect(() => require('cors')).not.toThrow();
    });

    it('should have dotenv installed', () => {
      expect(() => require('dotenv')).not.toThrow();
    });
  });

  describe('TypeScript Type Definitions', () => {
    it('should have @types/node installed', () => {
      // Check if types are available
      const fs = require('fs');
      const path = require('path');
      const nodeModulesPath = path.join(__dirname, '../node_modules/@types/node');
      
      expect(fs.existsSync(nodeModulesPath)).toBe(true);
    });

    it('should have @types/express installed', () => {
      const fs = require('fs');
      const path = require('path');
      const typesPath = path.join(__dirname, '../node_modules/@types/express');
      
      expect(fs.existsSync(typesPath)).toBe(true);
    });

    it('should have @types/morgan installed', () => {
      const fs = require('fs');
      const path = require('path');
      const typesPath = path.join(__dirname, '../node_modules/@types/morgan');
      
      expect(fs.existsSync(typesPath)).toBe(true);
    });
  });

  describe('Prisma Configuration', () => {
    it('should have prisma schema file', () => {
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
      
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    it('should be able to create PrismaClient without errors', () => {
      const { PrismaClient } = require('@prisma/client');
      
      expect(() => new PrismaClient()).not.toThrow();
    });

    it('should have DATABASE_URL configured', () => {
      // In test environment, DATABASE_URL should be set
      if (process.env.NODE_ENV === 'test' || process.env.CI) {
        expect(process.env.DATABASE_URL).toBeDefined();
        expect(process.env.DATABASE_URL).toContain('postgresql://');
      }
    });
  });

  describe('Package.json Validation', () => {
    it('should have valid package.json', () => {
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.join(__dirname, '../package.json');
      
      expect(fs.existsSync(packagePath)).toBe(true);
      
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      
      expect(packageJson.name).toBeDefined();
      expect(packageJson.version).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
    });

    it('should have all critical dependencies in package.json', () => {
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      
      const criticalDeps = [
        'express',
        '@prisma/client',
        'helmet',
        'morgan',
        'cors',
        'dotenv'
      ];
      
      criticalDeps.forEach(dep => {
        expect(packageJson.dependencies[dep]).toBeDefined();
      });
    });

    it('should have TypeScript and types in devDependencies', () => {
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      
      expect(packageJson.devDependencies?.typescript).toBeDefined();
      expect(packageJson.devDependencies?.['@types/node']).toBeDefined();
      expect(packageJson.devDependencies?.['@types/express']).toBeDefined();
    });
  });

  describe('Build Configuration', () => {
    it('should have tsconfig.json', () => {
      const fs = require('fs');
      const path = require('path');
      const tsconfigPath = path.join(__dirname, '../tsconfig.json');
      
      expect(fs.existsSync(tsconfigPath)).toBe(true);
    });

    it('should have valid TypeScript configuration', () => {
      const fs = require('fs');
      const path = require('path');
      const tsconfigPath = path.join(__dirname, '../tsconfig.json');
      
      if (fs.existsSync(tsconfigPath)) {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
        
        expect(tsconfig.compilerOptions).toBeDefined();
        expect(tsconfig.compilerOptions.target).toBeDefined();
        expect(tsconfig.compilerOptions.module).toBeDefined();
      }
    });
  });
});
