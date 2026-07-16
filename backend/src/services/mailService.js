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

// ── Escrow / Order notifications (Phase 4) ──
// Fire-and-forget, same as the auth notifications above. A mail failure
// must never fail a money transition. Functions accept userId (or email
// string for webhook/system notifications) and resolve the address async.

async function resolveEmail(userIdOrEmail) {
  if (typeof userIdOrEmail === "string" && userIdOrEmail.includes("@")) return userIdOrEmail;
  const { User } = await import("../models/User.js");
  const user = await User.findById(userIdOrEmail).select("email");
  return user ? user.email : null;
}

export function sendPaymentReceivedNotification(userId, orderId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Payment received for order", text: `Payment received for order ${orderId}. Funds held in escrow until delivery confirmed.` });
  });
}

export function sendOrderShippedNotification(userId, orderId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Order shipped", text: `Order ${orderId} marked shipped. Confirm delivery once received.` });
  });
}

export function sendOrderDeliveredNotification(userId, orderId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Order delivered", text: `Order ${orderId} marked delivered. Funds release after hold period.` });
  });
}

export function sendOrderDisputedNotification(userId, orderId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Order disputed", text: `Order ${orderId} disputed. Admin will review.` });
  });
}

export function sendOrderReleasedNotification(userId, orderId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Funds released", text: `Funds for order ${orderId} released.` });
  });
}

export function sendOrderRefundedNotification(userId, orderId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Order refunded", text: `Order ${orderId} refunded.` });
  });
}

export function sendIllegalTransitionAlert(userId, orderId, fromStatus, toStatus) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Security alert: illegal transition", text: `Illegal transition ${fromStatus}->${toStatus} blocked on order ${orderId}.` });
  });
}

// ── Verification notifications (Phase 5) ──

export function sendVerificationSubmittedNotification(userId, requestId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Verification request submitted", text: `Your verification request ${requestId} has been submitted and is pending review.` });
  });
}

export function sendVerificationApprovedNotification(userId, requestId) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Verification approved", text: `Your verification request ${requestId} has been approved. You are now a verified seller.` });
  });
}

export function sendVerificationRejectedNotification(userId, requestId, reason) {
  resolveEmail(userId).then((email) => {
    if (!email) return;
    sendMailAsync({ to: email, subject: "Verification request rejected", text: `Your verification request ${requestId} was rejected. Reason: ${reason}` });
  });
}

export function sendMagicLinkEmail(email, token) {
  sendMailAsync({
    to: email,
    subject: "Sign in to BazaarHub",
    text: `Use this link to sign in without a password: ${token}\n\nThis link is single-use and expires in 15 minutes. If you didn't request this, you can ignore this email.`,
  });
}

export function sendPasswordExpiryWarning(email) {
  sendMailAsync({
    to: email,
    subject: "Your BazaarHub password is about to expire",
    text: "Your password was last changed over 80 days ago. Please change it to continue using your account securely.",
  });
}
