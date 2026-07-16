import { Types } from "mongoose";
import { UserModel, IUser } from "../models/user.model";
import { UserRole, SellerTier } from "../types/user.type";
import { logEvent } from "./audit.service";
import { revokeAllSessionsForUser } from "./session.service";

type IdLike = Types.ObjectId | string;

interface RecordChangeArgs {
  actorId: IdLike;
  subjectId: IdLike;
  action: string;
  before: string;
  after: string;
}

async function recordChange({ actorId, subjectId, action, before, after }: RecordChangeArgs): Promise<void> {
  await logEvent({ actor: actorId as Types.ObjectId, subject: subjectId as Types.ObjectId, action, outcome: "success", before, after });
}

// Self-attack fix: an admin targeting their own account would land the
// role/tier write and then revoke the very session making the request; if
// the target is the LAST admin, the change is unrecoverable in-app. Block
// self-targeting entirely rather than racing a "are you the last admin"
// count query at write time.
export class SelfTargetError extends Error {
  code = "SELF_TARGET";
  constructor() {
    super("Admins cannot change their own role or tier through this endpoint");
  }
}

// Admin-only (route-level requireRole("admin") + requireMfaVerified). No
// "except when acting on yourself" carve-out exists.
export async function changeUserRole(actorId: IdLike, subjectId: IdLike, newRole: UserRole): Promise<IUser | null> {
  if (String(actorId) === String(subjectId)) {
    throw new SelfTargetError();
  }

  const subject = await UserModel.findById(subjectId);
  if (!subject) return null;

  const before = subject.role;
  if (before === newRole) return subject;

  subject.role = newRole;
  await subject.save();

  // Stale privileges must not survive a role change — any session issued
  // under the old role stops working on its next request.
  await revokeAllSessionsForUser(subjectId as Types.ObjectId);

  await recordChange({ actorId, subjectId, action: "role_change", before, after: newRole });

  return subject;
}

export async function changeUserTier(actorId: IdLike, subjectId: IdLike, newTier: SellerTier): Promise<IUser | null> {
  if (String(actorId) === String(subjectId)) {
    throw new SelfTargetError();
  }

  const subject = await UserModel.findById(subjectId);
  if (!subject) return null;

  const before = subject.sellerTier;
  if (before === newTier) return subject;

  subject.sellerTier = newTier;
  await subject.save();

  await revokeAllSessionsForUser(subjectId as Types.ObjectId);

  await recordChange({ actorId, subjectId, action: "tier_change", before, after: newTier });

  return subject;
}
