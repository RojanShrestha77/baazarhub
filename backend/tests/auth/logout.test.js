import request from "supertest";

import { createApp } from "../../src/app.js";
import { Session } from "../../src/models/Session.js";
import { createUser, createSession } from "../helpers/fixtures.js";

const app = createApp();

describe("logout", () => {
  it("revokes only the current session, not other sessions for the same user", async () => {
    const user = await createUser();
    const { cookie, session } = await createSession(user);
    const { session: otherSession } = await createSession(user);

    const res = await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
    expect(res.status).toBe(204);

    const revoked = await Session.findById(session._id);
    const other = await Session.findById(otherSession._id);
    expect(revoked.revokedAt).toBeTruthy();
    expect(other.revokedAt).toBeFalsy();
  });

  it("rejects a request with no session", async () => {
    const res = await request(app).post("/api/auth/logout").send({});
    expect(res.status).toBe(401);
  });

  it("a revoked session can't be reused", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user);

    await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
    const second = await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
    expect(second.status).toBe(401);
  });
});

describe("logout-all", () => {
  it("revokes every session for the user", async () => {
    const user = await createUser();
    const { cookie, session: sessionA } = await createSession(user);
    const { session: sessionB } = await createSession(user);

    const res = await request(app).post("/api/auth/logout-all").set("Cookie", cookie).send({});
    expect(res.status).toBe(204);

    const a = await Session.findById(sessionA._id);
    const b = await Session.findById(sessionB._id);
    expect(a.revokedAt).toBeTruthy();
    expect(b.revokedAt).toBeTruthy();
  });

  it("does not revoke another user's sessions", async () => {
    const user = await createUser();
    const otherUser = await createUser({ email: "other@example.com" });
    const { cookie } = await createSession(user);
    const { session: otherSession } = await createSession(otherUser);

    await request(app).post("/api/auth/logout-all").set("Cookie", cookie).send({});

    const other = await Session.findById(otherSession._id);
    expect(other.revokedAt).toBeFalsy();
  });
});
