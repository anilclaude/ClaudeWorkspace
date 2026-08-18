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
  // Each *.int-spec.ts file gets its own module registry (and so its own
  // db.ts DataSource singleton), and every file calls initTestDb(), which
  // runs pending migrations. With more than one int-spec file, Jest's
  // default multi-worker parallelism lets two files race to apply the same
  // pending migration against the one shared test database at once — the
  // loser's CREATE TABLE fails because the winner's already landed. Forcing
  // one worker keeps migration application sequential across files.
  maxWorkers: 1,
};
