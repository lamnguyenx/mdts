module.exports = {
  runner: 'jest-runner-eslint',
  displayName: 'lint',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['<rootDir>/src/**/*.ts', '<rootDir>/test/**/*.ts'],
};
