/**
 * Lightweight unit-test setup for the pure logic layer.
 *
 * These tests deliberately avoid the `jest-expo` preset: everything under
 * `src/utils` (and the constants it reads) is free of React Native imports, so
 * a plain Node environment runs them far faster and without native mocks. If we
 * later test components/screens, add a separate `jest-expo` project rather than
 * widening this one.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
};
