import request from "supertest";

import { createApp } from "../../src/app.js";
import { Session } from "../../src/models/Session.js";
import { createUser, createSession } from "../helpers/fixtures.js";

// Decision #1 follow-up: two separate code paths, not one function with a
// flag.
//   - Self-service change (re-verified, already authenticated) -> kill all
//     OTHER sessions, keep the current one.
//   - Reset/recovery via email token -> kill ALL sessions, no exceptions,
//     including whichever session initiated the reset.
//
// Fails now: both routes are unimplemented stubs, so no session state
// changes at all — none of the assertions below are met yet.

const app = createApp();

describe("password change (self-service) — kill all-but-current", () => {
  it("revokes other sessions but keeps the session that made the change", async () => {
    const user = await createUser();
    const { cookie: currentCookie, session: currentSession } = await createSession(user);
    const { session: otherSession } = await createSession(user);

    await request(app)
      .post("/api/auth/password/change")
      .set("Cookie", currentCookie)
      .send({ currentPassword: "correct horse battery staple", newPassword: "new-password-123" });

    const current = await Session.findById(currentSession._id);
    const other = await Session.findById(otherSession._id);

    expect(current?.revokedAt).toBeFalsy();
    expect(other?.revokedAt).toBeTruthy();
  });
});

describe("password reset (recovery) — kill all, no exceptions", () => {
  it("revokes every session, including the one that initiated the reset", async () => {
    const user = await createUser();
    const { cookie: initiatingCookie, session: initiatingSession } = await createSession(user);
    const { session: otherSession } = await createSession(user);

    await request(app)
      .post("/api/auth/password/reset/confirm")
      .set("Cookie", initiatingCookie)
      .send({ token: "placeholder-reset-token", newPassword: "new-password-123" });

    const initiating = await Session.findById(initiatingSession._id);
    const other = await Session.findById(otherSession._id);

    expect(initiating?.revokedAt).toBeTruthy();
    expect(other?.revokedAt).toBeTruthy();
  });
});
