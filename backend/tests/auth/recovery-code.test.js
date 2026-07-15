import request from "supertest";

import { createApp } from "../../src/app.js";
import { RecoveryCode } from "../../src/models/RecoveryCode.js";
import { createUser, createSession, createRecoveryCode } from "../helpers/fixtures.js";

// Decision #5: single-use enforcement must be one atomic findOneAndUpdate,
// not look-up-then-write — a naive implementation lets two concurrent
// submissions of the SAME code both succeed (TOCTOU). This test fires two
// concurrent requests with the same plaintext code and checks the DB ends
// up with exactly one consumed code, not zero and not two.
//
// Fails now: attachSession is an unimplemented stub (always sees no
// session), so both requests currently 401 before ever reaching the
// recovery-code route's TODO body — "exactly one success" is unmet either
// way. This will start exercising the real path once attachSession's
// lookup and the recovery-code route are both implemented.

const app = createApp();

describe("recovery code — concurrent submission (TOCTOU)", () => {
  it("accepts the same code from exactly one of two concurrent requests", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user, { mfaVerified: false });
    const { plaintext } = await createRecoveryCode(user);

    const [first, second] = await Promise.all([
      request(app)
        .post("/api/auth/mfa/recovery-code/verify")
        .set("Cookie", cookie)
        .send({ code: plaintext }),
      request(app)
        .post("/api/auth/mfa/recovery-code/verify")
        .set("Cookie", cookie)
        .send({ code: plaintext }),
    ]);

    const successes = [first, second].filter((r) => r.status === 200);
    expect(successes).toHaveLength(1);

    const consumed = await RecoveryCode.find({ userId: user._id, used: true });
    expect(consumed).toHaveLength(1);
  });

  it("rejects the same code on a second, sequential submission", async () => {
    const user = await createUser();
    const { cookie } = await createSession(user, { mfaVerified: false });
    const { plaintext } = await createRecoveryCode(user);

    const firstRes = await request(app)
      .post("/api/auth/mfa/recovery-code/verify")
      .set("Cookie", cookie)
      .send({ code: plaintext });
    const secondRes = await request(app)
      .post("/api/auth/mfa/recovery-code/verify")
      .set("Cookie", cookie)
      .send({ code: plaintext });

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(400);
  });
});
