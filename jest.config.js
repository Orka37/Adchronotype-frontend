module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: ['<rootDir>/test/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/api/**/*.js',
    '!src/api/config.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
};
