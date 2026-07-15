import argon2 from "argon2";

import { User } from "../../src/models/User.js";
import { Session } from "../../src/models/Session.js";
import { RecoveryCode } from "../../src/models/RecoveryCode.js";
import { generateSessionToken, hashSessionToken } from "../../src/lib/sessionToken.js";
import { SESSION_COOKIE_NAME } from "../../src/middleware/session.js";

// Test fixtures only — this is scaffolding to exercise the routes/models,
// not a stand-in for the auth logic itself (which is TODO throughout
// src/). Uses argon2id directly per decision #3 since these tests need a
// user that could plausibly authenticate once login is implemented.

export async function createUser(overrides = {}) {
  const passwordHash = await argon2.hash(overrides.password || "correct horse battery staple", {
    type: argon2.argon2id,
  });
  return User.create({
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    passwordHash,
    role: overrides.role || "buyer",
    mfaEnabled: overrides.mfaEnabled ?? false,
  });
}

// Returns { rawToken, cookie, session } — rawToken/cookie let a test act as
// this session over HTTP; session is the raw Mongo document for direct
// assertions. NOTE: this only produces a document attachSession COULD find
// once its lookup logic is implemented — today attachSession is a TODO
// stub that never looks anything up, so requests using this cookie will
// still see req.session === null. That's expected: these fixtures describe
// the target contract, they don't fake the implementation.
export async function createSession(user, overrides = {}) {
  const rawToken = generateSessionToken();
  const now = Date.now();
  const session = await Session.create({
    tokenHash: hashSessionToken(rawToken),
    userId: user._id,
    expiresAt: overrides.expiresAt || new Date(now + 30 * 60 * 1000),
    absoluteExpiresAt: overrides.absoluteExpiresAt || new Date(now + 7 * 24 * 60 * 60 * 1000),
    mfaVerified: overrides.mfaVerified ?? true,
    revokedAt: overrides.revokedAt,
  });
  return {
    rawToken,
    cookie: `${SESSION_COOKIE_NAME}=${rawToken}`,
    session,
  };
}

// Returns the plaintext code so the test can submit it, alongside the
// stored (hashed) document.
export async function createRecoveryCode(user) {
  const plaintext = generateSessionToken().slice(0, 10);
  const codeHash = await argon2.hash(plaintext, { type: argon2.argon2id });
  const doc = await RecoveryCode.create({
    userId: user._id,
    codeHash,
  });
  return { plaintext, doc };
}
