// Categories are seeded, not user-creatable — this is the only place
// Category documents are ever written. Idempotent: reruns upsert by slug.
import "dotenv/config";
import mongoose from "mongoose";
import { CategoryModel } from "../src/models/category.model";
import { MONGODB_URI } from "../src/configs";

const CATEGORIES = [
  { name: "Electronics", slug: "electronics" },
  { name: "Furniture", slug: "furniture" },
  { name: "Clothing", slug: "clothing" },
  { name: "Books", slug: "books" },
  { name: "Vehicles", slug: "vehicles" },
  { name: "Home & Kitchen", slug: "home-kitchen" },
  { name: "Sports & Outdoors", slug: "sports-outdoors" },
  { name: "Other", slug: "other" },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);

  for (const category of CATEGORIES) {
    await CategoryModel.updateOne({ slug: category.slug }, { $set: category }, { upsert: true });
  }

  console.log(`Seeded ${CATEGORIES.length} categories`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
