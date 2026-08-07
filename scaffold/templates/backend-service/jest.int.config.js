// Integration tests — require a running Postgres (`pnpm db:up` from platform/).
// Kept separate from jest.config.js so the unit suite stays fast and
// Docker-free for the inner development loop.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.int-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test/load-test-env.ts'],
  // Migrations on a cold database take longer than Jest's 5s default.
  testTimeout: 30000,
};
