import mongoose from "mongoose";

export type UserRole = "buyer" | "seller" | "admin";
export type SellerTier = "unverified" | "verified" | "trusted";

// AES-256-GCM envelope for the TOTP secret at rest (decision #4). keyVersion
// lets the encryption key rotate without forcing MFA re-enrolment.
export interface TotpSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

// Per-account exponential backoff state (decision #6). NOT a hard lock.
export interface LoginFailure {
  count: number;
  lastAttemptAt?: Date;
  nextAttemptAllowedAt?: Date;
}
