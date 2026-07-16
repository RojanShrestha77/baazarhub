import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_PORT, MAIL_FROM } from "../configs";

// SMTP client wiring only — no email content lives here. In Docker this
// points at the mailhog service; caught mail is readable at
// http://localhost:8025 and never leaves the machine.
export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
});

export { MAIL_FROM };
