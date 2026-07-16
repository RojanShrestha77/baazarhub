import { AuditLog } from "../models/AuditLog.js";

export async function sendAlert(subject, text) {
  const { transporter, MAIL_FROM } = await import("../lib/mailer.js");
  transporter.sendMail({ from: MAIL_FROM, to: process.env.ALERT_EMAIL || "admin@bazaarhub.local", subject, text }).catch(() => {});
}

const AUTH_FAIL_BURST_IP = 10;
const AUTH_FAIL_BURST_WINDOW = 5 * 60 * 1000;
const DOC_ACCESS_SPIKE = 50;

export async function runDetectionRules(entry) {
  try {
    if (entry.action === "login" && entry.outcome === "failure" && entry.ip) {
      const since = new Date(Date.now() - AUTH_FAIL_BURST_WINDOW);
      const count = await AuditLog.countDocuments({ action: "login", outcome: "failure", ip: entry.ip, createdAt: { $gte: since } });
      if (count >= AUTH_FAIL_BURST_IP) {
        sendAlert("auth_burst_from_ip", `IP ${entry.ip}: ${count} failed logins in 5m`);
      }
    }

    if (entry.action === "recovery_code_use" && entry.outcome === "success") {
      sendAlert("recovery_code_used", `User ${entry.actor} used a recovery code`);
    }

    if ((entry.action === "role_change" || entry.action === "tier_change") && entry.outcome === "failure") {
      sendAlert("privilege_escalation_attempt", `Action: ${entry.action}, Actor: ${entry.actor}, IP: ${entry.ip}`);
    }

    if (entry.action === "verification_doc_access" && entry.ip) {
      const since = new Date(Date.now() - AUTH_FAIL_BURST_WINDOW);
      const count = await AuditLog.countDocuments({ action: "verification_doc_access", ip: entry.ip, createdAt: { $gte: since } });
      if (count >= DOC_ACCESS_SPIKE) {
        sendAlert("doc_access_spike", `IP ${entry.ip}: ${count} doc accesses in 5m`);
      }
    }

    if (entry.action.startsWith("escrow_") && entry.outcome === "failure") {
      sendAlert("illegal_escrow_transition", `Action: ${entry.action}, Actor: ${entry.actor}`);
    }
  } catch {
    /* never break the main flow */
  }
}
