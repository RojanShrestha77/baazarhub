# BazaarHub

A Daraz-style e-commerce marketplace with escrow payments and tiered seller verification.

**Stack:** React + Vite · Node.js / Express · MongoDB · Docker

---

## Architecture

```
browser → nginx (frontend :3000) → backend API (:5000) → MongoDB (:27017)
```

- **frontend/** — React SPA, served by nginx in Docker
- **backend/** — Express REST API, connects to MongoDB via Mongoose
- **docs/** — Security decisions, threat model, pentest notes

---

## Running with Docker (recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in the required secrets before starting
```

### 2. Start all services

```bash
docker compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| API      | http://localhost:5000      |
| MongoDB  | mongodb://localhost:27017  |

### 3. Stop

```bash
docker compose down
# To also remove volumes (wipes database):
docker compose down -v
```

---

## Running without Docker (development)

### Backend

```bash
cd backend
npm install
# Create a .env file in backend/ with at minimum: MONGODB_URI, PORT
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Security Scanning (CI)

The `.github/workflows/security.yml` workflow runs on every push to `main`:

| Tool      | Scans for                              |
|-----------|----------------------------------------|
| Gitleaks  | Secrets in git history                 |
| npm audit | Known CVEs in dependencies             |
| Semgrep   | OWASP Top 10 code patterns             |
| CodeQL    | Semantic vulnerabilities               |
| Trivy     | CVEs in Docker image layers            |

---

## Documentation

- [`docs/security-decisions.md`](docs/security-decisions.md) — design decisions and rationale
- [`docs/threat-model.md`](docs/threat-model.md) — STRIDE threat model
- [`docs/pentest-notes.md`](docs/pentest-notes.md) — penetration test findings
