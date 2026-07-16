import type { Config } from "jest";

// --runInBand (package.json test script) is required: several suites do real
// argon2id hashing, heavy enough that parallel workers create CPU contention
// that skews the login-timing comparison.
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/timing/"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 20000,
};

export default config;
