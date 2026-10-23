module.exports = {
  projects: [
    {
      displayName: 'test',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/test', '<rootDir>/src'],
      testMatch: ['<rootDir>/test/**/?(*.)+(spec|test).ts'],
      transformIgnorePatterns: ['node_modules'],
      setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { transpilation: true }]
      }
    },
    "<rootDir>/jest-lint.config.js",
  ],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
}
