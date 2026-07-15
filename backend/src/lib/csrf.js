import crypto from "node:crypto";

// Double-submit cookie CSRF defense, scoped to AUTHENTICATED state-
// changing routes only (logout, logout-all, session/refresh, mfa/*,
// password/change) — not register/login/password/reset/*, which run
// before any session exists and have no session cookie's damage to
// protect against in the first place. Login-CSRF (tricking a victim into
// authenticating as an attacker-controlled account) is a real but
// separate concern, not addressed here — noted as a scope cut, not an
// oversight.
//
// The cookie proves "this browser was issued a token by us"; the header
// proves "JS running on our own origin read that cookie and chose to
// echo it back" — a cross-site attacker's forged request can't read the
// cookie (same-origin policy) to produce a matching header. This is
// defense-in-depth on top of decision #2's SameSite=Lax, which already
// blocks the cookie itself from being attached to most cross-site
// requests.
export const CSRF_COOKIE_NAME = "__Host-bazaarhub-csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function setCsrfCookie(res, token) {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // frontend JS MUST be able to read this one
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

export function requireCsrfToken(req, res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: "Missing CSRF token" });
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
}
