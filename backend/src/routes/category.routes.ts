import { createAuthzRouter } from "../lib/authzRouter";
import { PUBLIC } from "../middlewares/authz";
import { CategoryModel } from "../models/category.model";

const router = createAuthzRouter();

// Categories are seeded, never user-created — no POST/PATCH/DELETE exists.
// Browsing is open marketplace metadata, so PUBLIC like the health check.
router.get("/", PUBLIC, async (_req, res, next) => {
  try {
    const categories = await CategoryModel.find().sort({ name: 1 });
    return res.status(200).json(categories.map((c) => ({ id: c._id, name: c.name, slug: c.slug })));
  } catch (err) {
    next(err);
  }
});

export default router;
