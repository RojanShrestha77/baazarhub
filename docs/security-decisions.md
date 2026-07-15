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
