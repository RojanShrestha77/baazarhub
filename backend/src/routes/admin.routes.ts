import { createAuthzRouter } from "../lib/authzRouter";
import { requireRole, requireMfaVerified } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import { adminActionLimiter } from "../middlewares/rate-limiters";
import { validateBody, validateObjectIdParam } from "../middlewares/validate";
import { roleChangeSchema, tierChangeSchema, RoleChangeDto, TierChangeDto } from "../validators/admin.schema";
import { changeUserRole, changeUserTier, SelfTargetError } from "../services/admin.service";

const router = createAuthzRouter();

// Admin actions require an MFA-verified session, not just the admin role —
// requireRole("admin") alone would let a stolen pre-MFA admin session reach
// these routes.
const ADMIN_MFA = [requireRole("admin"), requireMfaVerified];

// ── Role change (:id re-resolved server-side, never trusted alone) ──
router.patch("/users/:id/role", ADMIN_MFA, requireCsrfToken, adminActionLimiter, validateObjectIdParam("id"), validateBody(roleChangeSchema), async (req, res, next) => {
  try {
    const subject = await changeUserRole(req.user!._id, req.params.id, (req.validatedBody as RoleChangeDto).role);
    if (!subject) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json({ id: subject._id, role: subject.role });
  } catch (err) {
    if (err instanceof SelfTargetError) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ── Tier change ──
router.patch("/users/:id/tier", ADMIN_MFA, requireCsrfToken, adminActionLimiter, validateObjectIdParam("id"), validateBody(tierChangeSchema), async (req, res, next) => {
  try {
    const subject = await changeUserTier(req.user!._id, req.params.id, (req.validatedBody as TierChangeDto).sellerTier);
    if (!subject) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json({ id: subject._id, sellerTier: subject.sellerTier });
  } catch (err) {
    if (err instanceof SelfTargetError) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
