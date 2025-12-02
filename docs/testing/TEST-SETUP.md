# Test Setup Guide

Quick guide to set up your local environment for running tests.

## Prerequisites

- Node.js 16.x or 18.x
- PostgreSQL (for backend tests)
- npm or yarn

## Quick Start (Frontend Only)

If you just want to run frontend tests without database setup:

```bash
./scripts/run-tests.sh
```

This will:
- ✅ Run frontend tests
- ⚠️ Skip backend tests (requires database)
- ✅ Run linting checks

## Full Setup (All Tests)

To run all tests including backend API tests, you need a PostgreSQL test database.

### 1. Install PostgreSQL

**macOS (Homebrew)**:
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian**:
```bash
sudo apt-get install postgresql-14
sudo systemctl start postgresql
```

**Windows**:
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Test Database

```bash
# Connect to PostgreSQL
psql postgres

# Create test database and user
CREATE DATABASE customer_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE customer_test TO test_user;
\q
```

### 3. Set Environment Variable

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export DATABASE_URL="postgresql://test_user:test_password@localhost:5432/customer_test"
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 4. Run Migrations

```bash
cd services/customer
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 5. Run All Tests

```bash
./scripts/run-tests.sh
```

Now all tests should run! 🎉

## Alternative: Use Existing Development Database

If you already have a local development database, you can use it for tests:

```bash
# Use your existing database
export DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/customer"

# Run tests
./scripts/run-tests.sh
```

⚠️ **Warning**: Tests will create and delete test data. Use a separate test database if possible.

## Troubleshooting

### "npm: command not found"

Make sure Node.js is installed and nvm is loaded:
```bash
# Check Node.js
node --version

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### "Authentication failed against database server"

Check your database credentials:
```bash
# Test connection
psql "$DATABASE_URL"

# If it fails, verify:
# 1. PostgreSQL is running
# 2. Database exists
# 3. User has correct password
# 4. User has permissions
```

### "Migrations already applied" but tests still fail

Regenerate Prisma client:
```bash
cd services/customer
npx prisma generate
cd ../..
```

### Tests timeout

Increase Jest timeout in `jest.config.js`:
```javascript
module.exports = {
  testTimeout: 30000 // 30 seconds
};
```

## Running Specific Tests

### Frontend only
```bash
cd frontend
npm test
```

### Backend only
```bash
cd services/customer
npm test
```

### Single test file
```bash
cd services/customer
npm test -- messaging.api.test.ts
```

### Watch mode (development)
```bash
cd frontend
npm test -- --watch
```

## CI/CD

Tests run automatically in GitHub Actions with a PostgreSQL service container. No local setup needed for CI.

## Need Help?

1. Check [TESTING.md](./TESTING.md) for detailed documentation
2. Review existing tests for examples
3. Ask in #engineering Slack channel
