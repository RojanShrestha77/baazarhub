import crypto from "node:crypto";

// Mechanical utility, not a security policy decision: generate an opaque,
// high-entropy bearer token for the session cookie, and hash it before it
// ever touches the DB (see models/Session.js for why). SHA-256 is
// appropriate here specifically because the input is already
// uniformly-random, high-entropy, machine-generated — this is not password
// hashing and argon2id would be pointless cost for no security benefit,
// unlike decision #3 (which is about a human-chosen, low-entropy secret).

const TOKEN_BYTES = 32;

export function generateSessionToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
