module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true, // Skip type checking for faster tests
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  verbose: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
