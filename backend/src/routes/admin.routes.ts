import { createAuthzRouter } from "../lib/authzRouter";
import { requireRole, requireMfaVerified } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import { adminActionLimiter } from "../middlewares/rate-limiters";
import { validateBody, validateObjectIdParam } from "../middlewares/validate";
import { roleChangeSchema, tierChangeSchema } from "../validators/admin.schema";
import { AdminController } from "../controllers/admin.controller";

const router = createAuthzRouter();
const admin = new AdminController();

// Admin actions require an MFA-verified session, not just the admin role —
// requireRole("admin") alone would let a stolen pre-MFA admin session reach
// these routes.
const ADMIN_MFA = [requireRole("admin"), requireMfaVerified];

router.patch("/users/:id/role", ADMIN_MFA, requireCsrfToken, adminActionLimiter, validateObjectIdParam("id"), validateBody(roleChangeSchema), admin.changeRole);
router.patch("/users/:id/tier", ADMIN_MFA, requireCsrfToken, adminActionLimiter, validateObjectIdParam("id"), validateBody(tierChangeSchema), admin.changeTier);

export default router;
