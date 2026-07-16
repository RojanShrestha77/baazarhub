## 2026-07-15 — CI security scanning

Set up CodeQL, Semgrep, Trivy, gitleaks in Actions. Fails build on high severity.
Chose gitleaks over relying only on GitHub secret scanning — wanted it to block the
build, not just alert after the fact.

## 2026-07-15 — Container hardening

Multi-stage builds, non-root user in both Dockerfiles. Smaller attack surface if
the app is compromised — no build tooling in the runtime image.

## 2026-07-15 — Session strategy

Server-side sessions in Mongo, not JWT.
Rejected JWT: BazaarHub is a single API + single DB — no distributed verification
problem, so statelessness buys nothing but costs revocation. Marketplace needs
instant kill: fraudulent seller downgrade, account lockout, and MFA step-up all
break if claims are frozen in a token for 15 min.
Also: pre-MFA vs post-MFA state is a session flag server-side; as a JWT claim it's
an MFA-bypass waiting to happen.
Considered JWT + refresh rotation w/ reuse detection — good, but it's a session
store with extra moving parts I'd have to defend.
TTL index on sessions collection so expired records don't accumulate.

## 2026-07-16 — RBAC: deny-by-default routing

Every route is registered through `createAuthzRouter()` (backend/src/lib/authzRouter.js),
which requires an explicit authorization declaration (`PUBLIC` or an array of tagged gates
from `src/middleware/authz.js`) as the 2nd argument to every route call — it throws at
import/boot time if that's missing. This isn't just a lint rule: a route literally cannot be
registered without declaring what it needs. A Jest test
(`backend/tests/authz/route-declarations.test.js`) additionally walks the live Express route
table and fails the build if any registered route's first middleware isn't a tagged gate, or
if the raw route count doesn't match what the wrapper knows about (catches someone bypassing
the wrapper entirely with a raw `express.Router()`).

Role (buyer/seller/admin) and seller tier (unverified -> verified -> trusted) are kept as
separate axes on `User`, not one combined enum — a seller's verification progress and a
user's role are orthogonal and change independently. Neither is cached on the Session
document; both are read fresh from `req.user` (populated from Mongo on every request), so an
admin's role/tier change takes effect on the subject's very next request without requiring
them to log back in.

## 2026-07-16 — Admin actions require MFA, not just the role

`requireRole("admin")` alone would let a stolen pre-MFA admin session (attacker has the
password but not the TOTP device) reach role/tier-change endpoints. Every admin route pairs
`requireRole("admin")` with `requireMfaVerified` — same class of gap `/password/change`
already closed in Phase 1.

## 2026-07-16 — Role/tier changes revoke sessions and are audited

Any admin-issued role or tier change calls `revokeAllSessionsForUser` on the subject
(`src/services/adminService.js`) — stale privileges (or a stale downgrade) must not survive
in an already-issued session token. Every change also writes an `AuditLog` entry (actor,
subject, before, after, timestamp) before the request completes; if that write fails the
request fails too (500), rather than silently letting a privilege change go unlogged.

No multi-document Mongo transaction wraps the write + revoke + audit sequence: this project
runs against a standalone `mongod` in dev/test (`mongodb-memory-server`), and standalone
`mongod` doesn't support multi-document transactions (replica-set only). The ordering is
chosen deliberately instead — the subject's field is written first, sessions are revoked
second, and the audit entry is written last, so an audit-write failure surfaces as a loud
500 rather than a change that landed with no record of who made it.

## 2026-07-16 — Profile mass assignment: structural, not filtered

`Profile` (backend/src/models/Profile.js) is a separate collection from `User`, not fields
bolted onto it. It has no `role`, `sellerTier`, `mfaEnabled`, or email-verification field at
all — so a mass-assignment attempt on those has nothing to write to, structurally, rather
than relying on an allowlist filter that a future refactor could accidentally loosen. The zod
schema (`src/validators/profile.schemas.js`) is `.strict()` on top of that as defense in
depth, and `profileService.updateProfile` still builds an explicit `$set` from a hardcoded
field list rather than spreading the validated body — the same two-layer discipline Phase 1
established for `User.create()`.

Public vs. private profile data uses two separate serializer functions
(`serializePublicProfile` / `serializePrivateProfile` in `src/services/profileService.js`),
not one function with a delete-on-the-way-out flag — a forgotten flag on a future call site
is a silent data leak, a wrong import is a visible mistake.

## 2026-07-16 — IDs are Mongo ObjectIds, not opaque tokens (accepted residual risk, revised)

`:id` routes (profile viewing, admin role/tier changes) use the Mongo `_id` directly rather
than a separate opaque/random public identifier. ObjectIds embed a 4-byte creation timestamp,
so they are *not* uniformly random — an attacker who knows roughly when an account was
created can narrow the search space for that account's id far below the full 96 bits of
entropy, though the remaining ~40 bits (5-byte random + 3-byte counter) still make brute-force
enumeration impractical for a single guess *if attempts are throttled*.

**That "if" was originally unstated and, when the Phase 2 self-attack pass actually tested it,
untrue.** `GET /api/profiles/:id` had no rate limiter at all — the acceptance below was written
assuming a bounded guess rate without anything in the code enforcing that bound. This wasn't
caught by design review, it was caught by hammering the route with 20 rapid requests and
watching all 20 succeed. The original entry is being revised rather than left to stand, because
the reasoning it gave ("brute-force is impractical") was doing work the code wasn't actually
doing.

The acceptance now explicitly depends on `profileReadLimiter` (`src/middleware/rateLimiters.js`,
120 requests / 15 min per IP), added specifically to back this decision, not as a generic
hardening pass. With that limiter in place: nothing in the current API exposes an ordered
listing of ids to enumerate against (no "list all users"/"list all sellers" endpoint); every
`:id` route re-resolves the resource from the DB and checks ownership/role server-side rather
than trusting the id as proof of anything, so a guessed id still can't be acted on without
already owning it or holding the matching admin privilege; and the per-IP request budget bounds
how many ids a single attacker can test against the remaining ~40 bits of non-timestamp entropy
per window. Revisit if a future phase adds a public listing endpoint that narrows the
timestamp-adjacency search space, if the "guess a low-cardinality private resource id" surface
grows (e.g. a future orders/documents resource with low natural volume), or if the rate limiter
is ever removed or its store becomes distributed without a shared budget (see the FIXME on
`express-rate-limit`'s in-memory store in `rateLimiters.js` — the same horizontal-scaling gap
applies here).

## 2026-07-16 — Admin role/tier changes block self-targeting

The Phase 2 self-attack pass found that an admin could `PATCH` their own account through the
role/tier-change routes. It succeeded — the write landed, then `revokeAllSessionsForUser`
immediately killed the very session that made the request. That's a bad experience on its own,
but the real reason this is now blocked outright (`SelfTargetError` in
`src/services/adminService.js`, returned as a 400) rather than left as a "don't do that" is
recoverability: if the admin who self-demotes happens to be the *last* admin account, the
change is unrecoverable from inside the app — there is no seed script, no break-glass account,
and nobody left holding the admin role to promote anyone back, including that same person.

The alternative — allow self-targeting but block it only when the actor is the last remaining
admin — was considered and rejected: it needs a live `count({role: "admin"})` query racing
against concurrent admin role changes to be reliable (two admins simultaneously demoting two
different other admins could both read "not the last one" and still leave zero), and it still
permits an admin locking themselves out of their own session on every other self-targeted
change (tier included, where "last admin" doesn't even apply). Blocking self-targeting
unconditionally on both routes is simpler and has no legitimate use case it forecloses — an
admin doesn't need this endpoint to manage their own account.

## 2026-07-16 — Data export/import is allowlist-scoped and self-only

`GET /api/profiles/me/export` and `POST /api/profiles/me/import`
(backend/src/routes/profile.routes.js) both operate exclusively on `req.user._id` — never a
body- or param-supplied id — so cross-user data exposure isn't a filtering question, there's
no code path that can even reach another user's document. Export assembles its response from
an explicit field list rather than a raw Mongoose `.populate()`/`.toObject()`, since populate
can pull in referenced documents (e.g. a future `Session` or `Order` populate) that were never
meant to leave the server. Import reuses the exact same `.strict()` `profileUpdateSchema` as
the regular profile-update route — not a separate, looser "import" schema — so it's provably
impossible to write role/tier/verification state through this path; it's the same
allowlist-enforcing code, re-entered from a different route.
