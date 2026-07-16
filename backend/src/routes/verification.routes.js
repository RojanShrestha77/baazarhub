import fs from "node:fs";
import path from "node:path";

import { createAuthzRouter } from "../lib/authzRouter.js";
import { requireSession, requireRole, requireMfaVerified } from "../middleware/authz.js";
import { requireCsrfToken } from "../lib/csrf.js";
import { escrowReadLimiter, verificationSubmitLimiter, verificationAdminLimiter } from "../middleware/rateLimiters.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import { rejectVerificationSchema } from "../validators/verification.schemas.js";
import {
  receiveVerificationDocs,
  validateAndStoreVerificationDocs,
  resolveVerificationDocPath,
} from "../middleware/verificationUpload.js";
import {
  submitRequest,
  approveRequest,
  rejectRequest,
  getMyRequest,
  listPendingRequests,
  SelfApprovalError,
  NoPendingRequestError,
  RequestNotFoundError,
} from "../services/verificationService.js";
import { VerificationRequest } from "../models/VerificationRequest.js";
import { AuditLog } from "../models/AuditLog.js";
import { logEvent } from "../services/auditService.js";

const router = createAuthzRouter();

function handleVerificationError(err, res, next) {
  if (err instanceof SelfApprovalError) return res.status(400).json({ error: err.message });
  if (err instanceof NoPendingRequestError) return res.status(409).json({ error: err.message });
  if (err instanceof RequestNotFoundError) return res.status(404).json({ error: err.message });
  next(err);
}

// ── Submit verification request (seller uploads docs) ──
router.post(
  "/submit",
  [requireSession, requireRole("seller")],
  requireCsrfToken,
  verificationSubmitLimiter,
  receiveVerificationDocs,
  validateAndStoreVerificationDocs,
  async (req, res, next) => {
    try {
      const request = await submitRequest(req.user._id, req.verificationDocuments);
      logEvent({ actor: req.user._id, action: "verification_submit", outcome: "success", ip: req.ip, userAgent: req.get("user-agent"), metadata: { requestId: String(request._id) } }).catch(() => {});
      return res.status(201).json({
        id: request._id,
        status: request.status,
        documents: request.documents.length,
        createdAt: request.createdAt,
      });
    } catch (err) {
      handleVerificationError(err, res, next);
    }
  },
);

// ── Get my verification status (seller checks their request) ──
router.get("/status", [requireSession], escrowReadLimiter, async (req, res, next) => {
  try {
    const request = await getMyRequest(req.user._id);
    if (!request) {
      return res.status(200).json({ status: null, message: "No verification request found" });
    }
    return res.status(200).json({
      id: request._id,
      status: request.status,
      documents: request.documents.length,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
    });
  } catch (err) {
    next(err);
  }
});

// ── List pending requests (admin) ──
router.get(
  "/requests",
  [requireSession, requireRole("admin"), requireMfaVerified],
  escrowReadLimiter,
  async (req, res, next) => {
    try {
      const { status } = req.query;
      const { listAllRequests } = await import("../services/verificationService.js");
      const requests = status ? await listAllRequests({ status }) : await listPendingRequests();
      return res.status(200).json(requests);
    } catch (err) {
      next(err);
    }
  },
);

// ── Serve a verification document ──
// Access control: only the owning seller or an admin can view.
// Every access is audit-logged — these are ID documents.
router.get(
  "/documents/:filename",
  [requireSession],
  escrowReadLimiter,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      // Prevent path traversal in filename
      if (filename.includes("..") || filename.includes(path.sep)) {
        return res.status(404).json({ error: "Not found" });
      }

      // Find the VerificationRequest that owns this document
      const request = await VerificationRequest.findOne({ "documents.filename": filename });
      if (!request) {
        return res.status(404).json({ error: "Not found" });
      }

      // Authorization: only the seller or an admin can access
      const isOwner = String(request.sellerId) === String(req.user._id);
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(404).json({ error: "Not found" });
      }

      // Find the specific document metadata
      const docMeta = request.documents.find((d) => d.filename === filename);
      if (!docMeta) {
        return res.status(404).json({ error: "Not found" });
      }

      // Resolve the file path
      const filePath = resolveVerificationDocPath(filename);
      if (!filePath) {
        return res.status(404).json({ error: "Not found" });
      }

      // Audit log the access
      await logEvent({ actor: req.user._id, subject: request.sellerId, action: "verification_doc_access", outcome: "success", ip: req.ip, userAgent: req.get("user-agent"), after: { filename, requestId: request._id } });

      // Stream the file
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        return res.status(404).json({ error: "Not found" });
      }
      res.setHeader("Content-Type", docMeta.mime);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Content-Disposition", `inline; filename="${docMeta.originalName}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },
);

// ── Approve verification request (admin, MFA required) ──
router.post(
  "/requests/:id/approve",
  [requireSession, requireRole("admin"), requireMfaVerified],
  requireCsrfToken,
  verificationAdminLimiter,
  validateObjectIdParam("id"),
  async (req, res, next) => {
    try {
      const request = await approveRequest(req.params.id, req.user._id);
      return res.status(200).json({
        id: request._id,
        status: request.status,
        reviewedAt: request.reviewedAt,
      });
    } catch (err) {
      handleVerificationError(err, res, next);
    }
  },
);

// ── Reject verification request (admin, MFA required) ──
router.post(
  "/requests/:id/reject",
  [requireSession, requireRole("admin"), requireMfaVerified],
  requireCsrfToken,
  verificationAdminLimiter,
  validateObjectIdParam("id"),
  validateBody(rejectVerificationSchema),
  async (req, res, next) => {
    try {
      const request = await rejectRequest(req.params.id, req.user._id, req.validatedBody.reason);
      logEvent({ actor: req.user._id, action: "verification_reject", outcome: "success", subject: request.sellerId, ip: req.ip, userAgent: req.get("user-agent"), metadata: { requestId: req.params.id, reason: req.validatedBody.reason } }).catch(() => {});
      return res.status(200).json({
        id: request._id,
        status: request.status,
        rejectionReason: request.rejectionReason,
        reviewedAt: request.reviewedAt,
      });
    } catch (err) {
      handleVerificationError(err, res, next);
    }
  },
);

export default router;
