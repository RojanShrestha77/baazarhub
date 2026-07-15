import { transporter, MAIL_FROM } from "../lib/mailer.js";

// Fire-and-forget on purpose (decision #7): callers must NOT await this
// before responding to the client — response timing correlating with
// "was an email actually queued" is itself an enumeration signal. Errors
// are logged, never thrown back into the request path.
export function sendMailAsync(options) {
  transporter.sendMail({ from: MAIL_FROM, ...options }).catch((err) => {
    console.error("sendMailAsync failed:", err.message);
  });
}

export function sendRegistrationConfirmation(email) {
  sendMailAsync({
    to: email,
    subject: "Welcome to BazaarHub",
    text: "Your BazaarHub account has been created.",
  });
}

// Decision #7's registration-enumeration mitigation: existing addresses
// get a different notification, not a different HTTP response.
export function sendExistingAccountNotice(email) {
  sendMailAsync({
    to: email,
    subject: "Someone tried to register with your email",
    text:
      "Someone just tried to create a BazaarHub account using this email address, " +
      "but you already have one. If this wasn't you, no action is needed — your " +
      "account is unaffected. If you've forgotten your password, use the password " +
      "reset link on the login page.",
  });
}

export function sendPasswordResetEmail(email, resetToken) {
  sendMailAsync({
    to: email,
    subject: "Reset your BazaarHub password",
    text:
      `Use this token to reset your password: ${resetToken}\n\n` +
      "This link is single-use and expires shortly. If you didn't request this, " +
      "you can ignore this email.",
  });
}

export function sendRecoveryCodeUsedNotice(email) {
  sendMailAsync({
    to: email,
    subject: "A BazaarHub recovery code was used",
    text:
      "A recovery code was just used to sign in to your account, bypassing your " +
      "authenticator app. If this wasn't you, change your password immediately " +
      "and regenerate your recovery codes.",
  });
}
