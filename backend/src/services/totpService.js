import crypto from "node:crypto";
import { authenticator } from "otplib";

import { TOTP_STEP_SECONDS, TOTP_WINDOW_STEPS, TOTP_ISSUER } from "../config/totp.js";

// Set ONCE at module load. `authenticator` is a shared singleton — an
// earlier version of this file tried to mutate `.options.epoch` per call
// to hand-roll step-by-step verification, and that produced unreliable,
// self-contradictory results under manual testing (confirmed empirically,
// not assumed) on top of being a live concurrency hazard: two concurrent
// requests mutating shared singleton state between their own await points
// could read each other's in-flight epoch override. Using the library's
// own checkDelta() below instead — it does the window search internally
// against the real current time, verified to return the correct delta (0
// for an exact current-step match, null for garbage) without any manual
// epoch manipulation.
authenticator.options = { step: TOTP_STEP_SECONDS, window: TOTP_WINDOW_STEPS };

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function buildOtpAuthUri(secret, email) {
  return authenticator.keyuri(email, TOTP_ISSUER, secret);
}

// Decision #4: AES-256-GCM, key selected by keyVersion so rotation doesn't
// force mass re-enrolment — old ciphertexts stay decryptable under the key
// version they were written with.
function getKey(keyVersion) {
  const b64 = process.env[`TOTP_ENCRYPTION_KEY_V${keyVersion}`];
  if (!b64) {
    throw new Error(`Missing TOTP_ENCRYPTION_KEY_V${keyVersion} in environment`);
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(`TOTP_ENCRYPTION_KEY_V${keyVersion} must decode to 32 bytes (AES-256)`);
  }
  return key;
}

export function encryptTotpSecret(plaintextSecret) {
  const keyVersion = Number(process.env.TOTP_KEY_VERSION || 1);
  const key = getKey(keyVersion);
  const iv = crypto.randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintextSecret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion,
  };
}

export function decryptTotpSecret(totpSecretDoc) {
  const key = getKey(totpSecretDoc.keyVersion);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(totpSecretDoc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(totpSecretDoc.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(totpSecretDoc.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

function currentStep() {
  return Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
}

// Replay prevention: checkDelta() tells us WHICH step (relative to now,
// within the configured window) the token matched, if any — we convert
// that to an absolute step number and reject if it's <= the last step
// this user already consumed, even if the code is numerically valid for
// that step. The library has no memory of what's been used; that's on us.
export function verifyAndConsumeTotp(secret, token, lastUsedStep) {
  const delta = authenticator.checkDelta(token, secret);
  if (delta === null) return null;

  const matchedStep = currentStep() + delta;
  if (lastUsedStep != null && matchedStep <= lastUsedStep) {
    return null;
  }
  return matchedStep;
}
