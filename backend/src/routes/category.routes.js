import { createAuthzRouter } from "../lib/authzRouter.js";
import { PUBLIC } from "../middleware/authz.js";
import { Category } from "../models/Category.js";

const router = createAuthzRouter();

// Categories are seeded (scripts/seedCategories.js), never user-created —
// there is no POST/PATCH/DELETE route for them anywhere in this codebase.
// Listing browsing is open marketplace metadata, so this is PUBLIC same
// as the health check, not gated behind a session.
router.get("/", PUBLIC, async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.status(200).json(
      categories.map((c) => ({ id: c._id, name: c.name, slug: c.slug })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
