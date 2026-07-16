import mongoose, { Schema, Document } from "mongoose";

// Not user-creatable — no create/update/delete route exists for categories.
// Seeded via scripts/seedCategories.ts. Referenced by Listing.category.
export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
}

const categorySchema = new Schema<ICategory>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
});

categorySchema.index({ slug: 1 }, { unique: true });

export const CategoryModel = mongoose.model<ICategory>("Category", categorySchema);
