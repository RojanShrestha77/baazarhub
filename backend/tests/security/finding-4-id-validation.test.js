// Phase 2 self-attack Finding 4: a malformed :id crashed through to a 500
// (Mongoose CastError) instead of a clean, uniform response. Not yet
// fixed — see docs/security-decisions.md for the reasoning that lands
// with the fix.
import request from "supertest";

import { createApp } from "../../src/app.js";
import { createUser, createSession } from "../helpers/fixtures.js";

const app = createApp();

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
