import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { revokeAllSessionsForUser } from "./sessionService.js";

// No multi-document transaction here: this project runs against a
// standalone mongod in dev/test (mongodb-memory-server, tests/setup.js),
// and standalone mongod doesn't support multi-doc transactions (replica
// set only). Ordering is chosen deliberately instead: write the subject's
// new value first, then revoke sessions, then write the audit entry last —
// if the audit write fails, that surfaces as a 500 rather than silently
// dropping the record, and a change that lands but fails to revoke
// sessions is worse than one that lands but fails to log, so sessions are
// revoked before the audit write, not after.

async function recordChange({ actorId, subjectId, action, before, after }) {
  await AuditLog.create({ actor: actorId, subject: subjectId, action, before, after });
}

// Post-Phase-2-self-attack fix (Finding 3): an admin could target their
// own account through these functions and succeed — the role/tier write
// would land, then revokeAllSessionsForUser would kill the very session
// making the request. That's not just a footgun: if the target of a
// self-demotion is the LAST admin account, the change is unrecoverable
// in-app — nobody with an admin role remains to promote anyone back, and
// nothing in this codebase (no seed script, no break-glass account) can
// re-grant it. Blocking self-targeting entirely avoids having to detect
// "are you the last admin" at write time, which would need a live count
// query racing against concurrent admin changes to be reliable anyway.
export class SelfTargetError extends Error {
  constructor() {
    super("Admins cannot change their own role or tier through this endpoint");
    this.code = "SELF_TARGET";
  }
}

// Admin-only (route-level requireRole("admin") + requireMfaVerified —
// src/routes/admin.routes.js). Sellers cannot self-promote: this function
// is only ever reachable through that route, and a non-admin session can
// never pass requireRole("admin") to reach it in the first place — there's
// no separate "except when acting on yourself" carve-out to bypass.
export async function changeUserRole(actorId, subjectId, newRole) {
  if (String(actorId) === String(subjectId)) {
    throw new SelfTargetError();
  }

  const subject = await User.findById(subjectId);
  if (!subject) return null;

  const before = subject.role;
  if (before === newRole) return subject;

  subject.role = newRole;
  await subject.save();

  // Stale privileges must not survive a role change — any session issued
  // under the old role stops working on its very next request.
  await revokeAllSessionsForUser(subjectId);

  await recordChange({ actorId, subjectId, action: "role_change", before, after: newRole });

  return subject;
}

export async function changeUserTier(actorId, subjectId, newTier) {
  if (String(actorId) === String(subjectId)) {
    throw new SelfTargetError();
  }

  const subject = await User.findById(subjectId);
  if (!subject) return null;

  const before = subject.sellerTier;
  if (before === newTier) return subject;

  subject.sellerTier = newTier;
  await subject.save();

  await revokeAllSessionsForUser(subjectId);

  await recordChange({ actorId, subjectId, action: "tier_change", before, after: newTier });

  return subject;
}
