module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '!**/tests/e2e/**'
  ],
  collectCoverageFrom: [
    'static/**/*.js',
    '!**/tests/**'
  ]
};
