module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.integration.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/tests/**'
  ],
  coverageDirectory: 'coverage/integration',
  testTimeout: 30000, // 30 seconds for database operations
  setupFilesAfterEnv: ['<rootDir>/src/tests/integration/setup.ts'],
  verbose: true
};
