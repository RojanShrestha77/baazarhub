import nodemailer from "nodemailer";

// SMTP client wiring only — no email content lives here. In Docker this
// points at the mailhog service (see docker-compose.yml); caught mail is
// readable at http://localhost:8025 and never leaves the machine. Point
// at a real provider's SMTP relay via .env in production.
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
});

export const MAIL_FROM = process.env.MAIL_FROM || "no-reply@bazaarhub.local";

// TODO (yours): the actual notification content lives with the auth logic
// that triggers it, e.g.:
//   - registration confirmation
//   - password reset link (short-lived, single-use, bound to the user —
//     decision #7 requires the "send" step to happen async so response
//     timing doesn't correlate with whether an email was actually queued)
//   - "someone used a recovery code" notification (decision #5)
//   - "a new registration attempt used your email" notification
//     (decision #7's registration-enumeration mitigation)
