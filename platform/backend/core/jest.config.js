module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: /.*\.spec\.ts$/.source,
  // Integration specs also end in .spec.ts — they run via jest.int.config.js
  // and need a database, so keep them out of the fast unit suite.
  testPathIgnorePatterns: ['\\.int-spec\\.ts$'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
