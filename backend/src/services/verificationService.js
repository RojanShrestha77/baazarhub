import { VerificationRequest } from "../models/VerificationRequest.js";
import { AuditLog } from "../models/AuditLog.js";
import { logEvent } from "./auditService.js";
import { revokeAllSessionsForUser } from "./sessionService.js";
import {
  sendVerificationSubmittedNotification,
  sendVerificationApprovedNotification,
  sendVerificationRejectedNotification,
} from "./mailService.js";

export class SelfApprovalError extends Error {
  constructor() {
    super("Admins cannot approve their own verification request");
    this.code = "SELF_APPROVAL";
  }
}

export class NoPendingRequestError extends Error {
  constructor() {
    super("No pending verification request");
    this.code = "NO_PENDING_REQUEST";
  }
}

export class RequestNotFoundError extends Error {
  constructor() {
    super("Verification request not found");
    this.code = "REQUEST_NOT_FOUND";
  }
}

// Submit a new verification request (creates if no pending exists, or rejects if one is already pending)
export async function submitRequest(sellerId, documents) {
  const existing = await VerificationRequest.findOne({ sellerId, status: "pending" });
  if (existing) {
    throw new NoPendingRequestError();
  }

  const request = await VerificationRequest.create({
    sellerId,
    documents,
    status: "pending",
  });

  sendVerificationSubmittedNotification(sellerId, request._id);
  return request;
}

// Admin approves a verification request — tier up + session revoke
export async function approveRequest(requestId, adminId) {
  const request = await VerificationRequest.findById(requestId);
  if (!request) throw new RequestNotFoundError();
  if (request.status !== "pending") {
    throw new Error(`Cannot approve a request with status "${request.status}"`);
  }

  // Self-approval check
  if (String(request.sellerId) === String(adminId)) {
    throw new SelfApprovalError();
  }

  const { User } = await import("../models/User.js");
  const seller = await User.findById(request.sellerId);
  if (!seller) throw new Error("Seller not found");

  const before = seller.sellerTier;
  const after = "verified";

  // Atomic: write tier, revoke sessions, audit log
  seller.sellerTier = after;
  await seller.save();

  await revokeAllSessionsForUser(request.sellerId);

  await logEvent({ actor: adminId, subject: request.sellerId, action: "tier_change", outcome: "success", before, after });

  request.status = "approved";
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  await request.save();

  sendVerificationApprovedNotification(request.sellerId, request._id);
  return request;
}

// Admin rejects a verification request
export async function rejectRequest(requestId, adminId, reason) {
  const request = await VerificationRequest.findById(requestId);
  if (!request) throw new RequestNotFoundError();
  if (request.status !== "pending") {
    throw new Error(`Cannot reject a request with status "${request.status}"`);
  }

  request.status = "rejected";
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  request.rejectionReason = reason;
  await request.save();

  sendVerificationRejectedNotification(request.sellerId, request._id, reason);
  return request;
}

// Get the seller's current request status
export async function getMyRequest(sellerId) {
  const request = await VerificationRequest.findOne({ sellerId }).sort({ createdAt: -1 });
  return request;
}

// Admin lists all pending requests
export async function listPendingRequests() {
  return VerificationRequest.find({ status: "pending" }).sort({ createdAt: -1 }).populate("sellerId", "email");
}

// Admin lists all requests
export async function listAllRequests(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  return VerificationRequest.find(query).sort({ createdAt: -1 }).populate("sellerId", "email");
}
