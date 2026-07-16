import fs from "node:fs";

import { createAuthzRouter } from "../lib/authzRouter.js";
import { requireSession } from "../middleware/authz.js";
import { requireCsrfToken } from "../lib/csrf.js";
import {
  exportLimiter,
  profileReadLimiter,
  profileWriteLimiter,
  avatarUploadLimiter,
} from "../middleware/rateLimiters.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import { profileUpdateSchema } from "../validators/profile.schemas.js";
import {
  getOrCreateProfile,
  updateProfile,
  setAvatarPath,
  serializePublicProfile,
  serializePrivateProfile,
} from "../services/profileService.js";
import { receiveAvatarUpload, validateAndStoreAvatar, resolveAvatarPath } from "../middleware/avatarUpload.js";
import { User } from "../models/User.js";

const router = createAuthzRouter();

// ── Own profile ───────────────────────────────────────────────────────
router.get("/me", [requireSession], profileReadLimiter, async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user._id);
    return res.status(200).json(serializePrivateProfile(profile, req.user));
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/me",
  [requireSession],
  requireCsrfToken,
  profileWriteLimiter,
  validateBody(profileUpdateSchema),
  async (req, res, next) => {
    try {
      const profile = await updateProfile(req.user._id, req.validatedBody);
      return res.status(200).json(serializePrivateProfile(profile, req.user));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/me/avatar",
  [requireSession],
  requireCsrfToken,
  avatarUploadLimiter,
  receiveAvatarUpload,
  validateAndStoreAvatar,
  async (req, res, next) => {
    try {
      const profile = await setAvatarPath(req.user._id, req.avatarFilename);
      return res.status(200).json(serializePrivateProfile(profile, req.user));
    } catch (err) {
      next(err);
    }
  },
);

// Always "mine" — no ownership resolver needed, req.user is the only
// possible owner.
router.get("/me/avatar", [requireSession], profileReadLimiter, async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user._id);
    return streamAvatar(profile.avatarPath, res, next);
  } catch (err) {
    next(err);
  }
});

// ── Data export / import (Phase 2, Slice 4) ──────────────────────────
// Both operate exclusively on req.user._id — never a body/param-supplied
// id — so there is no code path here that can reach another user's data,
// not a filter that has to catch it. See docs/security-decisions.md.
router.get("/me/export", [requireSession], exportLimiter, async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user._id);
    // Explicit field list, never req.user.toObject()/populate() — those
    // can carry fields (passwordHash, totpSecret, loginFailure) that must
    // never leave the server, and populate can pull in referenced
    // documents nobody asked for.
    return res.status(200).json({
      user: {
        email: req.user.email,
        role: req.user.role,
        sellerTier: req.user.sellerTier,
        mfaEnabled: req.user.mfaEnabled,
        createdAt: req.user.createdAt,
      },
      profile: {
        displayName: profile.displayName,
        bio: profile.bio,
        location: profile.location,
        hasAvatar: Boolean(profile.avatarPath),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Reuses the exact same .strict() schema as PATCH /me — not a separate,
// looser "import" schema — so writing role/tier/verification state through
// this path is provably impossible: it's the same allowlist-enforcing
// code, just re-entered from a different route.
router.post(
  "/me/import",
  [requireSession],
  requireCsrfToken,
  profileWriteLimiter,
  validateBody(profileUpdateSchema),
  async (req, res, next) => {
    try {
      const profile = await updateProfile(req.user._id, req.validatedBody);
      return res.status(200).json(serializePrivateProfile(profile, req.user));
    } catch (err) {
      next(err);
    }
  },
);

// ── Public profile viewing ────────────────────────────────────────────
// Intentionally not ownership-gated: reading another user's PUBLIC profile
// is the point of a marketplace. Nothing sensitive is reachable through
// this path because serializePublicProfile never includes it — there's
// no delete()-on-the-way-out step that could be forgotten.
router.get("/:id", [requireSession], profileReadLimiter, validateObjectIdParam("id"), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }
    const profile = await getOrCreateProfile(user._id);
    return res.status(200).json(serializePublicProfile(profile));
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:id/avatar",
  [requireSession],
  profileReadLimiter,
  validateObjectIdParam("id"),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Not found" });
      }
      const profile = await getOrCreateProfile(user._id);
      return streamAvatar(profile.avatarPath, res, next);
    } catch (err) {
      next(err);
    }
  },
);

function streamAvatar(storedFilename, res, next) {
  if (!storedFilename) {
    return res.status(404).json({ error: "No avatar set" });
  }
  const filePath = resolveAvatarPath(storedFilename);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "No avatar set" });
  }
  return res.sendFile(filePath, (err) => {
    if (err) next(err);
  });
}

export default router;
