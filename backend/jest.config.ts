import type { Config } from "jest";

// --runInBand (package.json test script) is required: several suites do real
// argon2id hashing, heavy enough that parallel workers create CPU contention
// that skews the login-timing comparison.
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  // ts-jest transpiles tests without type-checking (diagnostics off): tests
  // validate runtime behaviour, and type safety is enforced separately by
  // `npm run typecheck` (tsc --noEmit, strict) on production code. This keeps
  // test files free of null-assertion noise on DB reads without weakening the
  // production build's strictness.
  transform: {
    "^.+\\.ts$": ["ts-jest", { isolatedModules: true, diagnostics: false }],
  },
  testMatch: ["**/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/timing/"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 20000,
};

export default config;
