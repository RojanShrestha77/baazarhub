import mongoose from "mongoose";

const { Schema } = mongoose;

// Not user-creatable — no create/update/delete route exists anywhere in
// this codebase for categories. Seeded via scripts/seedCategories.js.
// Referenced by Listing.category (Phase 3, Slice 1).
const categorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
});

categorySchema.index({ slug: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
