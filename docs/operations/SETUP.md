# Tailtown Pet Resort Management System - Setup Guide

This document provides step-by-step instructions for setting up the Tailtown pet resort management system for development and testing.

## Prerequisites

These tools must be installed on your system:

1. **Node.js and pnpm** (v24+ recommended)
   ```bash
   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   nvm install --lts
   nvm use --lts
   
   # Or via homebrew on macOS
   brew install node
   ```

2. **PostgreSQL** (v12+ recommended)
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Create database
   createdb tailtown_dev
   ```

## Backend Setup

### Customer Service (Port 4004)

1. **Install dependencies**:
   ```bash
   cd /path/to/tailtown
   pnpm install
   ```

2. **Database setup**:
   ```bash
   # Generate Prisma client
   cd apps/customer-service
   pnpm exec prisma generate
   
   # Run migrations to set up database schema
   pnpm exec prisma migrate dev --name init
   
   # Optional: Seed the database with test data
   pnpm exec ts-node src/tests/scripts/seed-services.ts
   ```

3. **Start the customer service**:
   ```bash
   cd apps/customer-service
   source ~/.nvm/nvm.sh
   pnpm run dev
   ```
   The server should start on http://localhost:4004

### Reservation Service (Port 4003)

1. **Install dependencies**:
   ```bash
   cd /path/to/tailtown
   pnpm install
   ```

2. **Database setup**:
   ```bash
   # Generate Prisma client
   cd apps/reservation-service
   pnpm exec prisma generate
   
   # Run migrations
   pnpm exec prisma migrate deploy
   ```

3. **Start the reservation service**:
   ```bash
   cd apps/reservation-service
   source ~/.nvm/nvm.sh
   PORT=4003 pnpm run dev
   ```
   The server should start on http://localhost:4003

## Frontend Setup

1. **Install dependencies**:
   ```bash
   cd /path/to/tailtown
   pnpm install
   ```

2. **Start the development server**:
   ```bash
   cd apps/frontend
   source ~/.nvm/nvm.sh
   pnpm start
   ```
   The frontend should start on http://localhost:3000

## MCP RAG Server Setup (Optional)

The MCP RAG server provides AI-enhanced code search for Windsurf/Cascade.

1. **Install Python dependencies**:
   ```bash
   cd mcp-server
   pip install -r requirements.txt
   ```

2. **Configure Windsurf/Cascade**:
   Edit `~/.codeium/windsurf/mcp_config.json`:
   ```json
   {
     "mcpServers": {
       "local-rag": {
         "command": "python3",
         "args": ["/path/to/tailtown/mcp-server/server.py"],
         "env": {
           "PYTHONPATH": "/path/to/tailtown/mcp-server",
           "TAILTOWN_ROOT": "/path/to/tailtown"
         }
       }
     }
   }
   ```

3. **Restart Windsurf** to load the MCP server

4. **Verify**: Use `mcp0_list_indexed_files()` in Windsurf

See [MCP Server README](../../mcp-server/README.md) for complete documentation.

## Running Tests

1. **Run all tests**:
   ```bash
   cd /path/to/tailtown
   pnpm test
   ```

2. **Run specific tests**:
   ```bash
   cd apps/customer-service
   # Test the service controller
   pnpm test -- src/tests/controllers/service.controller.test.ts
   
   # Run integration tests
   pnpm test -- src/tests/integration
   
   # Run validation tests
   pnpm test -- src/tests/api-validation
   ```

3. **Generate test coverage report**:
   ```bash
   pnpm test -- --coverage
   ```

## Testing with Postman

1. Import the Postman collection from:
   `apps/customer-service/src/tests/postman/tailtown-services-api.postman_collection.json`

2. Configure a Postman environment with:
   - `baseUrl`: `http://localhost:4004`

3. Use the collection to test all service endpoints

## Manual Testing Steps

For manual testing without Postman, follow the test plan at:
`apps/customer-service/src/tests/manual-test-plan.md`

## Troubleshooting

1. **Database connection issues**:
   - Check that PostgreSQL is running
   - Verify DATABASE_URL in .env file
   - Ensure the database exists

2. **Missing modules errors**:
   - Run `pnpm install` again from the repo root
   - Delete node_modules folders and run `pnpm install`

3. **TypeScript errors**:
   - Add missing types with `pnpm add -D @types/node @types/express`
   - Ensure TypeScript is available in the workspace dependencies
