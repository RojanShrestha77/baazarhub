import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession } from "../middlewares/authz";
import { requireEmailVerified } from "../middlewares/session";
import { requireCsrfToken } from "../lib/csrf";
import { profileWriteLimiter } from "../middlewares/rate-limiters";
import { SellerController } from "../controllers/seller.controller";

const router = createAuthzRouter();
const seller = new SellerController();

// Self-service seller request. Session + CSRF required. The handler only ever
// moves the applicant to "pending" — granting the seller role stays an
// admin-only action (see admin routes).
router.post("/apply", [requireSession], requireEmailVerified, requireCsrfToken, profileWriteLimiter, seller.apply);

export default router;
