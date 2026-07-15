/** @type {import('jest').Config} */
// --runInBand (in package.json's test script) is required, not optional:
// several suites do real argon2id hashing, which is CPU/memory-heavy
// enough that running test files in parallel workers (Jest's default)
// creates cross-process CPU contention that skews
// tests/auth/login-timing.test.js's coarse timing comparison — confirmed
// by that test passing consistently in isolation and failing when other
// argon2-heavy suites (e.g. registration.test.js) run concurrently in a
// sibling worker.
export default {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/tests/timing/"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 20000,
};
