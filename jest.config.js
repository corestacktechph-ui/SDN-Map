const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  setupFilesAfterEnv: [],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/services/*.ts',
    'src/lib/*.ts',
    'src/store/*.ts',
    '!src/lib/prisma.ts',
    '!src/lib/test-runner.ts',
  ],
}

module.exports = createJestConfig(customJestConfig)
