## 2026-07-15 — CI security scanning

Set up CodeQL, Semgrep, Trivy, gitleaks in Actions. Fails build on high severity.
Chose gitleaks over relying only on GitHub secret scanning — wanted it to block the
build, not just alert after the fact.

## 2026-07-15 — Container hardening

Multi-stage builds, non-root user in both Dockerfiles. Smaller attack surface if
the app is compromised — no build tooling in the runtime image.
