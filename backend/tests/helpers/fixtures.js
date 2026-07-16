import { User } from "../../src/models/User.js";
import { Session } from "../../src/models/Session.js";
import { RecoveryCode } from "../../src/models/RecoveryCode.js";
import { Category } from "../../src/models/Category.js";
import { generateSessionToken, hashSessionToken } from "../../src/lib/sessionToken.js";
import { SESSION_COOKIE_NAME } from "../../src/middleware/session.js";
import { hashPassword } from "../../src/services/passwordService.js";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, generateCsrfToken } from "../../src/lib/csrf.js";
import { createListing as createListingService } from "../../src/services/listingService.js";

// Test fixtures only — this is scaffolding to exercise the routes/models,
// not a stand-in for the auth logic itself. Uses hashPassword() (the real
// service, real ARGON2_OPTIONS) rather than calling argon2.hash directly —
// an earlier version of this file called argon2.hash(pw, { type: argon2id })
// with no memoryCost/timeCost/parallelism, which used argon2's *defaults*
// (parallelism=4) instead of our configured params (parallelism=1). Since
// argon2 embeds its params in the output hash string, verifyPassword()
// against that fixture ran at p=4 while the dummy-hash path (built from
// ARGON2_OPTIONS) ran at p=1 — a large, very real, reproducible timing gap
// that looked exactly like a decision #7 leak in tests/auth/login-timing.test.js
// and wasn't: it was this fixture using different hashing params than
// production code. Always hash test fixtures through the same path
// production code uses, or timing tests measure the fixture, not the app.

export async function createUser(overrides = {}) {
  const passwordHash = await hashPassword(overrides.password || "correct horse battery staple");
  return User.create({
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    passwordHash,
    role: overrides.role || "buyer",
    sellerTier: overrides.sellerTier || "unverified",
    mfaEnabled: overrides.mfaEnabled ?? false,
  });
}

// Returns { rawToken, cookie, cookies, csrfToken, csrfHeader, session }.
// `cookie` is just the session cookie (for routes that don't need CSRF,
// e.g. GET-ish/read paths). `cookies` bundles session + CSRF cookies
// together (supertest: .set("Cookie", cookies)) and `csrfHeader` is ready
// to spread into .set() for routes guarded by requireCsrfToken — which is
// every authenticated mutating route as of Slice 5, so most tests want
// `cookies` + `csrfHeader`, not `cookie` alone.
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

  const csrfToken = generateCsrfToken();
  const sessionCookie = `${SESSION_COOKIE_NAME}=${rawToken}`;
  const csrfCookie = `${CSRF_COOKIE_NAME}=${csrfToken}`;

  return {
    rawToken,
    cookie: sessionCookie,
    cookies: [sessionCookie, csrfCookie],
    csrfToken,
    csrfHeader: { [CSRF_HEADER_NAME]: csrfToken },
    session,
  };
}

// Returns the plaintext code so the test can submit it, alongside the
// stored (hashed) document.
export async function createRecoveryCode(user) {
  const plaintext = generateSessionToken().slice(0, 10);
  const codeHash = await hashPassword(plaintext);
  const doc = await RecoveryCode.create({
    userId: user._id,
    codeHash,
  });
  return { plaintext, doc };
}

export async function createCategory(overrides = {}) {
  const unique = `${Date.now()}-${Math.random()}`;
  return Category.create({
    name: overrides.name || `Category ${unique}`,
    slug: overrides.slug || `category-${unique}`,
  });
}

// Goes through the real service layer (listingService.createListing), not
// a raw Listing.create() — so fixture-created listings are subject to the
// same tier-limit/category-validation rules production traffic is,
// exactly the discipline the fixtures.js header comment above already
// established for password hashing. `overrides.status` bypasses the
// transition table directly (fixtures are allowed to set up state
// production code path can't reach in one step — e.g. an already-"active"
// listing for a cart test — the same way createSession bypasses
// sessionService.createSession to construct pre-aged/revoked sessions).
export async function createListing(seller, overrides = {}) {
  const category = overrides.category || (await createCategory())._id;
  const listing = await createListingService(seller, {
    title: overrides.title || "Test listing",
    description: overrides.description,
    priceMinorUnits: overrides.priceMinorUnits ?? 10000,
    category,
    quantity: overrides.quantity,
  });
  if (overrides.status && overrides.status !== listing.status) {
    listing.status = overrides.status;
    await listing.save();
  }
  return listing;
}

// Phase 4: creates an Order doc in the given state for testing.
// Skips Stripe and the service layer — tests that need a specific order
// state (e.g. "shipped" for confirm-delivery tests) create it directly
// so they don't need to walk the whole checkout->payment->ship path.
// `overrides.status` defaults to "created".
export async function createOrder(buyer, seller, listing, overrides = {}) {
  const { Order } = await import("../../src/models/Order.js");
  const { HOLD_DURATION_MS } = await import("../../src/services/escrowService.js");

  const quantity = overrides.quantity || 1;
  const totalMinorUnits = (overrides.priceMinorUnits ?? listing.priceMinorUnits) * quantity;

  const order = await Order.create({
    buyerId: buyer._id,
    sellerId: seller._id,
    listingId: listing._id,
    listingSnapshot: {
      title: listing.title,
      priceMinorUnits: listing.priceMinorUnits,
      currency: listing.currency || "NPR",
    },
    quantity,
    totalMinorUnits,
    holdDurationMs: HOLD_DURATION_MS[seller.sellerTier || "unverified"],
    stripePaymentIntentId: overrides.stripePaymentIntentId || `pi_test_${Date.now()}`,
    status: overrides.status || "created",
    deliveredAt: overrides.deliveredAt,
    disputedAt: overrides.disputedAt,
  });
  return order;
}

// Phase 5: creates a VerificationRequest doc in the given state for testing.
// Skips the upload flow — tests that need a specific state (e.g. "pending"
// for approve/reject tests) create it directly.
export async function createVerificationRequest(seller, overrides = {}) {
  const { VerificationRequest } = await import("../../src/models/VerificationRequest.js");

  return VerificationRequest.create({
    sellerId: seller._id,
    documents: overrides.documents || [
      { filename: `test-doc-${Date.now()}.pdf`, originalName: "id.pdf", mime: "application/pdf", size: 1024 },
    ],
    status: overrides.status || "pending",
    reviewedBy: overrides.reviewedBy,
    reviewedAt: overrides.reviewedAt,
    rejectionReason: overrides.rejectionReason,
  });
}
