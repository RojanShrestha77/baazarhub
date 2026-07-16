import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession, requireRole, requireMfaVerified } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import { escrowReadLimiter, verificationSubmitLimiter, verificationAdminLimiter } from "../middlewares/rate-limiters";
import { validateBody, validateObjectIdParam } from "../middlewares/validate";
import { rejectVerificationSchema } from "../validators/verification.schema";
import {
  receiveVerificationDocs,
  validateAndStoreVerificationDocs,
} from "../middlewares/verification-upload";
import { VerificationController } from "../controllers/verification.controller";

const router = createAuthzRouter();
const verification = new VerificationController();

router.post("/submit", [requireSession, requireRole("seller")], requireCsrfToken, verificationSubmitLimiter, receiveVerificationDocs, validateAndStoreVerificationDocs, verification.submit);

router.get("/status", [requireSession], escrowReadLimiter, verification.getStatus);

router.get("/requests", [requireSession, requireRole("admin"), requireMfaVerified], escrowReadLimiter, verification.listRequests);

router.get("/documents/:filename", [requireSession], escrowReadLimiter, verification.serveDocument);

router.post("/requests/:id/approve", [requireSession, requireRole("admin"), requireMfaVerified], requireCsrfToken, verificationAdminLimiter, validateObjectIdParam("id"), verification.approve);

router.post("/requests/:id/reject", [requireSession, requireRole("admin"), requireMfaVerified], requireCsrfToken, verificationAdminLimiter, validateObjectIdParam("id"), validateBody(rejectVerificationSchema), verification.reject);

export default router;
