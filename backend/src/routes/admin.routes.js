import { createAuthzRouter } from "../lib/authzRouter.js";
import { requireRole, requireMfaVerified } from "../middleware/authz.js";
import { requireCsrfToken } from "../lib/csrf.js";
import { adminActionLimiter } from "../middleware/rateLimiters.js";
import { validateBody } from "../middleware/validate.js";
import { roleChangeSchema, tierChangeSchema } from "../validators/admin.schemas.js";
import { changeUserRole, changeUserTier, SelfTargetError } from "../services/adminService.js";

const router = createAuthzRouter();

// Admin actions require an MFA-verified session, not just the admin role
// (Phase 2 decision) — requireRole("admin") alone would let a stolen
// pre-MFA admin session (attacker has the password but not the TOTP
// device) reach these routes, same class of gap password/change closed in
// Phase 1.
const ADMIN_MFA = [requireRole("admin"), requireMfaVerified];

// ── Role change ────────────────────────────────────────────────────────
// :id is re-resolved server-side by adminService (User.findById), never
// trusted as proof of anything on its own — same IDOR discipline as
// requireOwnership, just admin-scoped rather than self-scoped.
router.patch(
  "/users/:id/role",
  ADMIN_MFA,
  requireCsrfToken,
  adminActionLimiter,
  validateBody(roleChangeSchema),
  async (req, res, next) => {
    try {
      const subject = await changeUserRole(req.user._id, req.params.id, req.validatedBody.role);
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
  },
);

// ── Tier change ────────────────────────────────────────────────────────
router.patch(
  "/users/:id/tier",
  ADMIN_MFA,
  requireCsrfToken,
  adminActionLimiter,
  validateBody(tierChangeSchema),
  async (req, res, next) => {
    try {
      const subject = await changeUserTier(req.user._id, req.params.id, req.validatedBody.sellerTier);
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
  },
);

export default router;
