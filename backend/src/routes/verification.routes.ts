import fs from "node:fs";
import path from "node:path";
import { Response, NextFunction } from "express";
import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession, requireRole, requireMfaVerified } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import { escrowReadLimiter, verificationSubmitLimiter, verificationAdminLimiter } from "../middlewares/rate-limiters";
import { validateBody, validateObjectIdParam } from "../middlewares/validate";
import { rejectVerificationSchema, RejectVerificationDto } from "../validators/verification.schema";
import {
  receiveVerificationDocs,
  validateAndStoreVerificationDocs,
  resolveVerificationDocPath,
} from "../middlewares/verification-upload";
import {
  submitRequest,
  approveRequest,
  rejectRequest,
  getMyRequest,
  listPendingRequests,
  listAllRequests,
  SelfApprovalError,
  NoPendingRequestError,
  RequestNotFoundError,
} from "../services/verification.service";
import { VerificationRequestModel, VerificationStatus } from "../models/verification-request.model";
import { logEvent } from "../services/audit.service";

const router = createAuthzRouter();

function handleVerificationError(err: unknown, res: Response, next: NextFunction) {
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
      const request = await submitRequest(req.user!._id, req.verificationDocuments!);
      logEvent({ actor: req.user!._id, action: "verification_submit", outcome: "success", ip: req.ip, userAgent: req.get("user-agent"), metadata: { requestId: String(request._id) } }).catch(() => {});
      return res.status(201).json({ id: request._id, status: request.status, documents: request.documents.length, createdAt: request.createdAt });
    } catch (err) {
      handleVerificationError(err, res, next);
    }
  },
);

// ── Get my verification status ──
router.get("/status", [requireSession], escrowReadLimiter, async (req, res, next) => {
  try {
    const request = await getMyRequest(req.user!._id);
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

// ── List pending/all requests (admin) ──
router.get("/requests", [requireSession, requireRole("admin"), requireMfaVerified], escrowReadLimiter, async (req, res, next) => {
  try {
    const status = req.query.status as VerificationStatus | undefined;
    const requests = status ? await listAllRequests({ status }) : await listPendingRequests();
    return res.status(200).json(requests);
  } catch (err) {
    next(err);
  }
});

// ── Serve a verification document (owner or admin only; every access audited) ──
router.get("/documents/:filename", [requireSession], escrowReadLimiter, async (req, res, next) => {
  try {
    const { filename } = req.params;

    if (filename.includes("..") || filename.includes(path.sep)) {
      return res.status(404).json({ error: "Not found" });
    }

    const request = await VerificationRequestModel.findOne({ "documents.filename": filename });
    if (!request) {
      return res.status(404).json({ error: "Not found" });
    }

    const isOwner = String(request.sellerId) === String(req.user!._id);
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ error: "Not found" });
    }

    const docMeta = request.documents.find((d) => d.filename === filename);
    if (!docMeta) {
      return res.status(404).json({ error: "Not found" });
    }

    const filePath = resolveVerificationDocPath(filename);
    if (!filePath) {
      return res.status(404).json({ error: "Not found" });
    }

    await logEvent({ actor: req.user!._id, subject: request.sellerId, action: "verification_doc_access", outcome: "success", ip: req.ip, userAgent: req.get("user-agent"), after: { filename, requestId: request._id } });

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return res.status(404).json({ error: "Not found" });
    }
    res.setHeader("Content-Type", docMeta.mime);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `inline; filename="${docMeta.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

// ── Approve (admin, MFA required) ──
router.post("/requests/:id/approve", [requireSession, requireRole("admin"), requireMfaVerified], requireCsrfToken, verificationAdminLimiter, validateObjectIdParam("id"), async (req, res, next) => {
  try {
    const request = await approveRequest(req.params.id, req.user!._id);
    return res.status(200).json({ id: request._id, status: request.status, reviewedAt: request.reviewedAt });
  } catch (err) {
    handleVerificationError(err, res, next);
  }
});

// ── Reject (admin, MFA required) ──
router.post(
  "/requests/:id/reject",
  [requireSession, requireRole("admin"), requireMfaVerified],
  requireCsrfToken,
  verificationAdminLimiter,
  validateObjectIdParam("id"),
  validateBody(rejectVerificationSchema),
  async (req, res, next) => {
    try {
      const reason = (req.validatedBody as RejectVerificationDto).reason;
      const request = await rejectRequest(req.params.id, req.user!._id, reason);
      logEvent({ actor: req.user!._id, action: "verification_reject", outcome: "success", subject: request.sellerId, ip: req.ip, userAgent: req.get("user-agent"), metadata: { requestId: req.params.id, reason } }).catch(() => {});
      return res.status(200).json({ id: request._id, status: request.status, rejectionReason: request.rejectionReason, reviewedAt: request.reviewedAt });
    } catch (err) {
      handleVerificationError(err, res, next);
    }
  },
);

export default router;
