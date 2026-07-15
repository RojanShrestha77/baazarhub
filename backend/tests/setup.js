import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Real Mongo semantics (TTL indexes, atomic findOneAndUpdate) matter for
// several of these tests — an in-memory JS mock would silently pass tests
// that a real race condition would fail. mongodb-memory-server runs an
// actual mongod binary, just not the docker-compose one, so tests don't
// require `docker compose up` to run.

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});
