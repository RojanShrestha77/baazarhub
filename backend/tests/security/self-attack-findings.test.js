// Evidence from the Phase 2 self-attack pass (reported before any fix
// landed — see docs/security-decisions.md for the accompanying reasoning).
// This file is intentionally committed once documenting the VULNERABLE
// behavior, then edited in the fix commits that follow to assert the
// FIXED behavior — the git history of this file IS the before/after.
//
// Finding 1: profile routes had no rate limiting except GET /me/export.
// Finding 3: an admin could target their own account on the role/tier
//            change routes, immediately revoking their own session.
// Finding 4: a malformed :id crashed through to a 500 (Mongoose CastError)
//            instead of a clean 400/404, and — combined with Finding 1's
//            lack of throttling — an attacker could freely distinguish
//            malformed vs. nonexistent vs. real ids by response code.
import request from "supertest";

import { createApp } from "../../src/app.js";
import { createUser, createSession } from "../helpers/fixtures.js";

const app = createApp();

describe("Finding 1 — profile routes had no rate limiting", () => {
  it("PATCH /me: 25 rapid requests all succeed, no 429 anywhere", async () => {
    const user = await createUser();
    const { cookies, csrfHeader } = await createSession(user);

    const statuses = [];
    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .patch("/api/profiles/me")
        .set("Cookie", cookies)
        .set(csrfHeader)
        .send({ displayName: `spam-${i}` });
      statuses.push(res.status);
    }

    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it("GET /:id: 20 rapid enumeration probes all succeed, no 429 anywhere", async () => {
    const attacker = await createUser();
    const { cookie } = await createSession(attacker);

    const statuses = [];
    for (let i = 0; i < 20; i++) {
      const fakeId = i.toString().padStart(24, "0");
      const res = await request(app).get(`/api/profiles/${fakeId}`).set("Cookie", cookie);
      statuses.push(res.status);
    }

    expect(statuses.every((s) => s !== 429)).toBe(true);
  });
});

describe("Finding 3 — admin self-targeting was not blocked", () => {
  it("an admin can downgrade their own role, which immediately revokes their own session", async () => {
    const admin = await createUser({ role: "admin" });
    const { cookies, csrfHeader } = await createSession(admin, { mfaVerified: true });

    const res = await request(app)
      .patch(`/api/admin/users/${admin._id}/role`)
      .set("Cookie", cookies)
      .set(csrfHeader)
      .send({ role: "buyer" });

    expect(res.status).toBe(200);

    const followUp = await request(app).get("/api/profiles/me").set("Cookie", cookies);
    expect(followUp.status).toBe(401); // locked themselves out
  });
});

describe("Finding 4 — malformed :id crashed to a 500 instead of a clean, uniform response", () => {
  it("admin route: malformed id -> 500", async () => {
    const admin = await createUser({ role: "admin" });
    const { cookies, csrfHeader } = await createSession(admin, { mfaVerified: true });

    const res = await request(app)
      .patch("/api/admin/users/not-a-valid-id/role")
      .set("Cookie", cookies)
      .set(csrfHeader)
      .send({ role: "buyer" });

    expect(res.status).toBe(500);
  });

  it("profile route: malformed id -> 500, distinguishable from a well-formed-but-missing id's 404", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user);

    const malformed = await request(app).get("/api/profiles/not-a-valid-id").set("Cookie", cookie);
    const wellFormedMissing = await request(app)
      .get("/api/profiles/000000000000000000000000")
      .set("Cookie", cookie);

    expect(malformed.status).toBe(500);
    expect(wellFormedMissing.status).toBe(404);
    expect(malformed.status).not.toBe(wellFormedMissing.status); // the distinguishing signal
  });
});
