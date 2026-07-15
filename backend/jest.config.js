/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/tests/timing/"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 20000,
};
