// Phase 2 self-attack Finding 3: an admin could target their own account
// on the role/tier change routes, immediately revoking their own session.
// Not yet fixed — see docs/security-decisions.md for the reasoning that
// lands with the fix.
import request from "supertest";

import { createApp } from "../../src/app.js";
import { createUser, createSession } from "../helpers/fixtures.js";

const app = createApp();

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
