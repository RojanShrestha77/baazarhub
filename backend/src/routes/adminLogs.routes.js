import { createAuthzRouter } from "../lib/authzRouter.js";
import { requireSession, requireRole, requireMfaVerified } from "../middleware/authz.js";
import { adminActionLimiter } from "../middleware/rateLimiters.js";
import { AuditLog } from "../models/AuditLog.js";

const router = createAuthzRouter();
const ADMIN_MFA = [requireSession, requireRole("admin"), requireMfaVerified];

router.get("/logs", ADMIN_MFA, adminActionLimiter, async (req, res, next) => {
  try {
    const { action, actor, subject, outcome, ip, limit = 100, skip = 0, since, until } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (actor) filter.actor = actor;
    if (subject) filter.subject = subject;
    if (outcome) filter.outcome = outcome;
    if (ip) filter.ip = ip;
    if (since || until) {
      filter.createdAt = {};
      if (since) filter.createdAt.$gte = new Date(since);
      if (until) filter.createdAt.$lte = new Date(until);
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(Number(skip)).limit(Math.min(Number(limit), 1000)).populate("actor", "email role").populate("subject", "email role").lean(),
      AuditLog.countDocuments(filter),
    ]);
    return res.status(200).json({ logs, total, skip: Number(skip), limit: Math.min(Number(limit), 1000) });
  } catch (err) {
    next(err);
  }
});

router.get("/logs/stats", ADMIN_MFA, adminActionLimiter, async (req, res, next) => {
  try {
    const since = req.query.since || new Date(Date.now() - 86400000);
    const stats = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: new Date(since) } } },
      { $group: { _id: { action: "$action", outcome: "$outcome" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return res.status(200).json({ since, stats });
  } catch (err) {
    next(err);
  }
});

export default router;
