/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
import type { Config } from 'jest';

const config: Config = {
  collectCoverage: false,
  coverageDirectory: '.coverage',
  coverageProvider: 'v8',
  extensionsToTreatAsEsm: ['.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/examples', '<rootDir>/node_modules'],
  setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [
    '.*\\.test\\.tsx$',
    '.*\\.integration\\.test\\.ts$',
    '<rootDir>/dist',
    '<rootDir>/examples',
    '<rootDir>/node_modules',
    '<rootDir>/src/app',
  ],
  transform: {
    '^.+\\.m?[tj]sx?$': '<rootDir>/jest-esm-transformer.cjs',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|execa|strip-ansi|ansi-regex|ora|cli-spinners|log-symbols|is-unicode-supported|figures|string-width|emoji-regex|get-east-asian-width|onetime|signal-exit|mimic-function|human-signals|is-stream|npm-run-path|path-key|unicorn-magic)/)',
  ],
};

export default config;
