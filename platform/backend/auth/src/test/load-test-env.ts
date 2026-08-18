import { config } from 'dotenv';

// Runs before any test module is imported (jest.int.config.js setupFiles).
//
// Loaded first, without override, so precedence is:
//   real environment (CI)  >  .env.test  >  .env
// dotenv never overwrites an already-set variable, so loading .env.test here
// beats src/config/index.ts's later load of .env, while still letting CI point
// tests at its own database by exporting POSTGRES_* directly.
//
// The _test_db guard in ./db.ts is what makes that precedence safe — a stray
// POSTGRES_DB in someone's shell can't silently redirect tests at a dev
// database, it gets rejected.
config({ path: '.env.test' });
