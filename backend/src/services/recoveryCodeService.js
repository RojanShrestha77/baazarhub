import crypto from "node:crypto";

import { RecoveryCode } from "../models/RecoveryCode.js";
import { hashPassword, verifyPassword } from "./passwordService.js";

const CODE_COUNT = 10;

function formatCode() {
  // 5 bytes -> 10 hex chars, grouped for readability. Not trying to match
  // any standard format — these are typed once during a recovery flow,
  // not memorized.
  const raw = crypto.randomBytes(5).toString("hex");
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

// Decision #5: regeneration invalidates the WHOLE old set — deleteMany
// then insert fresh, not a per-code replace. Returns the plaintext codes
// so the caller can show them to the user exactly once; only the argon2id
// hashes are persisted.
export async function generateRecoveryCodes(userId) {
  await RecoveryCode.deleteMany({ userId });

  const plainCodes = [];
  const docs = [];
  for (let i = 0; i < CODE_COUNT; i++) {
    const plain = formatCode();
    const codeHash = await hashPassword(plain);
    plainCodes.push(plain);
    docs.push({ userId, codeHash });
  }
  await RecoveryCode.insertMany(docs);

  return plainCodes;
}

// Decision #5's TOCTOU requirement, with an honest caveat: the original
// plan text said "ONE atomic findOneAndUpdate matching {hash, used:false}"
// — that assumes a deterministic hash you can query by equality. argon2id
// is intentionally salted/non-deterministic, so the SAME plaintext code
// produces a DIFFERENT hash every time it's hashed; there is no codeHash
// value to query by without already knowing which stored document it
// corresponds to. This is a genuine fork from the literal plan, not a
// weakening of it: identifying the matching document requires a read-only
// verify pass over this user's unused codes (cheap — at most 10, and
// recovery-code verification is rare), but the actual STATE CHANGE is
// still exactly one atomic findOneAndUpdate keyed on the document's _id +
// used:false. Two concurrent requests for the same code both find the
// same _id in the read pass; only one of their subsequent atomic updates
// can flip used:false -> true. That's the property the TOCTOU test
// actually checks, and it holds regardless of whether the key is a raw
// hash or an _id obtained from a prior read.
export async function consumeRecoveryCode(userId, plaintextCode) {
  const candidates = await RecoveryCode.find({ userId, used: false });

  let matched = null;
  for (const candidate of candidates) {
    if (await verifyPassword(candidate.codeHash, plaintextCode)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) return null;

  return RecoveryCode.findOneAndUpdate(
    { _id: matched._id, used: false },
    { $set: { used: true, usedAt: new Date() } },
    { new: true },
  );
}
