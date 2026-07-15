import { SESSION_COOKIE_NAME, SESSION_ABSOLUTE_CAP_MS } from "../config/session.js";

// Decision #2: httpOnly (JS can't read it, narrows XSS to "attacker rides
// along live" rather than "attacker exfiltrates a portable credential)),
// Secure (works on http://localhost/127.0.0.1 — see the __Host- discussion
// in docs/security-decisions.md for exactly why, and what silently breaks
// it), SameSite=Lax (Strict would log users out clicking through
// transactional email links), __Host- prefix (forces Secure + Path=/ + no
// Domain — always set, never conditional on NODE_ENV, so this never
// silently degrades in prod because someone forgot an env check).
export function setSessionCookie(res, rawToken) {
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_ABSOLUTE_CAP_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}
