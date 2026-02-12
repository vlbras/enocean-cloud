import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.integration\\.test\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@enocean/common(.*)$': '<rootDir>/libs/common/src$1',
    '^@enocean/testing(.*)$': '<rootDir>/libs/testing/src$1',
  },
  // Integration tests may need more time
  testTimeout: 60000,
};

export default config;
