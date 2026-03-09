# Schema Validation System

This document describes the comprehensive schema validation system implemented for the Tailtown microservices architecture. The system ensures that all critical database tables and columns exist, generates detailed validation reports, provides clear guidance for fixing schema issues, and enables automatic safe migrations to enhance system robustness and maintainability.

## Overview

The schema validation system is designed to:

1. **Validate the database schema** against a defined schema definition on service startup
2. **Detect missing tables, columns, indexes, and relationships**
3. **Generate detailed reports** with actionable guidance
4. **Create migration scripts** to fix schema issues
5. **Optionally apply safe migrations** automatically

## Key Components

### Schema Definition

The system uses a comprehensive schema definition object that describes:

- Tables (critical and optional)
- Columns (critical and optional)
- Relationships (foreign keys)
- Indexes

This definition serves as the source of truth for the expected database schema.

### Validation Functions

The system provides several validation functions:

- `validateSchema()`: Main validation function that checks for all schema elements
- `tableExists()`: Checks if a table exists in the database
- `columnExists()`: Checks if a column exists in a table
- `indexExists()`: Checks if an index exists on a table
- `relationshipExists()`: Checks if a foreign key constraint exists

### Migration Generation

When schema issues are detected, the system can:

1. Generate SQL migration scripts to fix the issues
2. Save the scripts to a specified location
3. Optionally execute the migrations automatically

## Usage

### Basic Validation

To validate the schema without applying migrations:

```typescript
import { PrismaClient } from '@prisma/client';
import { validateSchema } from './utils/schemaUtils';

const prisma = new PrismaClient();

async function checkSchema() {
  const result = await validateSchema(prisma);
  
  if (!result.isValid) {
    console.log('Schema validation failed!');
    console.log(result.report.summary);
    console.log('Critical issues:', result.report.criticalIssues);
  }
}
```

### Validation with Auto-Migration

To validate the schema and automatically apply migrations:

```typescript
const result = await validateSchema(prisma, {
  autoMigrate: true,
  migrationPath: './prisma/migrations'
});

console.log(result.report.summary);
```

### Using the Test Script

A test script is provided to validate the schema from the command line:

```bash
# Basic validation
node test-schema-validation.js

# Validation with auto-migration
node test-schema-validation.js --auto-migrate

# Specify custom migration path
node test-schema-validation.js --migration-path=./custom/path
```

## Schema Validation Result

The validation function returns a comprehensive result object:

```typescript
interface SchemaValidationResult {
  isValid: boolean;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
  missingIndexes: Record<string, string[]>;
  missingRelationships: Record<string, string[]>;
  validationMap: Map<string, boolean>;
  report: SchemaValidationReport;
}

interface SchemaValidationReport {
  summary: string;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  migrationRequired: boolean;
  migrationSafe: boolean;
  migrationScript?: string;
}
```

## Integration with Service Startup

It's recommended to integrate schema validation into the service startup process:

```typescript
// In your service startup file
import { PrismaClient } from '@prisma/client';
import { validateSchema } from './utils/schemaUtils';

async function startService() {
  const prisma = new PrismaClient();
  
  // Validate schema before starting the service
  const validationResult = await validateSchema(prisma);
  
  if (!validationResult.isValid) {
    console.error('Schema validation failed!');
    console.error(validationResult.report.summary);
    
    // Log critical issues
    validationResult.report.criticalIssues.forEach(issue => {
      console.error(`Critical issue: ${issue}`);
    });
    
    // Log recommendations
    validationResult.report.recommendations.forEach(rec => {
      console.log(`Recommendation: ${rec}`);
    });
    
    // Decide whether to continue or exit based on your requirements
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to schema validation failure in production');
      process.exit(1);
    } else {
      console.warn('Continuing despite schema validation failure in development');
    }
  }
  
  // Continue with service startup
  // ...
}
```

## Best Practices

1. **Run validation on service startup** to catch schema issues early
2. **Save migration scripts** for review before applying in production
3. **Use auto-migration only in development environments**
4. **Add new tables and columns to the schema definition** when extending the application
5. **Keep the schema definition up-to-date** with your application's requirements

## Troubleshooting

If you encounter issues with schema validation:

1. Check database connection and permissions
2. Verify that the schema definition matches your expected schema
3. Review the generated migration scripts for any errors
4. Check the logs for detailed error messages

## Related Documentation

- [Database Migration Guide](../docs/DATABASE-MIGRATION.md)
- [Schema Alignment Strategy](../docs/SchemaAlignmentStrategy.md)
- [API Service Layer](../../docs/architecture/API-SERVICE-LAYER.md)
