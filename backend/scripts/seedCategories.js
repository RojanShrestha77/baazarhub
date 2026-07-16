// Categories are seeded, not user-creatable (Phase 3, Slice 2) — this is
// the only place Category documents are ever written. Idempotent: reruns
// upsert by slug rather than duplicating.
import "dotenv/config";
import mongoose from "mongoose";

import { Category } from "../src/models/Category.js";

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
  await mongoose.connect(process.env.MONGODB_URI);

  for (const category of CATEGORIES) {
    await Category.updateOne(
      { slug: category.slug },
      { $set: category },
      { upsert: true },
    );
  }

  console.log(`Seeded ${CATEGORIES.length} categories`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
