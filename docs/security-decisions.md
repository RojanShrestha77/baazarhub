# Security Decisions

## How to use this document
Record each significant security design decision here: what you chose, what you rejected, and why.
This is your evidence for the viva that you made informed, deliberate choices.

---

## Authentication

### Session management strategy

### Password hashing

### Token storage (access vs refresh)

### MFA / TOTP implementation

---

## Authorisation

### RBAC model

### Ownership checks

### Admin privilege escalation controls

---

## Escrow

### State machine trust model

### Payment provider integration security

### Webhook verification

---

## Seller Verification

### Document upload security (file type, size, path traversal)

### Verification tier privilege changes

---

## Transport & Infrastructure

### HTTPS / TLS

### HTTP security headers (Helmet configuration)

### CORS policy

### Rate limiting

---

## Dependencies & Supply Chain

### Dependency pinning strategy

### Audit cadence

---

## Rejected Approaches

<!-- Document things you considered and deliberately did not do, and why. -->
