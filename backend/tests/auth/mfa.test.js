import request from "supertest";
import { authenticator } from "otplib";

import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { createUser, createSession } from "../helpers/fixtures.js";

const app = createApp();

describe("MFA enrolment + verify", () => {
  it("enrols, then confirms with a valid code and flips mfaEnabled", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user, { mfaVerified: true });

    const enrolRes = await request(app).post("/api/auth/mfa/enrol").set("Cookie", cookie).send({});
    expect(enrolRes.status).toBe(200);
    expect(enrolRes.body.secret).toBeTruthy();
    expect(enrolRes.body.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(enrolRes.body.recoveryCodes).toHaveLength(10);

    const stillDisabled = await User.findById(user._id);
    expect(stillDisabled.mfaEnabled).toBe(false);

    const code = authenticator.generate(enrolRes.body.secret);
    const verifyRes = await request(app).post("/api/auth/mfa/verify").set("Cookie", cookie).send({ code });
    expect(verifyRes.status).toBe(200);

    const enabled = await User.findById(user._id);
    expect(enabled.mfaEnabled).toBe(true);
  });

  it("rejects an invalid code", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user, { mfaVerified: true });

    await request(app).post("/api/auth/mfa/enrol").set("Cookie", cookie).send({});
    const res = await request(app).post("/api/auth/mfa/verify").set("Cookie", cookie).send({ code: "000000" });
    expect(res.status).toBe(401);
  });

  it("rejects replay of an already-used code", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user, { mfaVerified: true });

    const enrolRes = await request(app).post("/api/auth/mfa/enrol").set("Cookie", cookie).send({});
    const code = authenticator.generate(enrolRes.body.secret);

    const first = await request(app).post("/api/auth/mfa/verify").set("Cookie", cookie).send({ code });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/auth/mfa/verify").set("Cookie", cookie).send({ code });
    expect(second.status).toBe(401);
  });

  it("400s if verify is attempted before enrolment", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user, { mfaVerified: true });

    const res = await request(app).post("/api/auth/mfa/verify").set("Cookie", cookie).send({ code: "123456" });
    expect(res.status).toBe(400);
  });
});
