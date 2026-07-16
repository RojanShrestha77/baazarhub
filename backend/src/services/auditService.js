import { AuditLog } from "../models/AuditLog.js";
import { runDetectionRules } from "./monitorService.js";

export async function logEvent({ actor, subject, action, outcome = "success", ip, userAgent, metadata, before, after }) {
  const entry = await AuditLog.create({ actor, subject, action, outcome, ip, userAgent, metadata, before, after });
  runDetectionRules(entry).catch(() => {});
  return entry;
}

export async function logAuthzFailure({ actor, action, ip, userAgent, metadata }) {
  return logEvent({ actor, action, outcome: "failure", ip, userAgent, metadata: { ...metadata, reason: "authorization_failure" } });
}
