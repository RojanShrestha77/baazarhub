import fs from "node:fs";
import { Response, NextFunction } from "express";
import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import {
  exportLimiter,
  profileReadLimiter,
  profileWriteLimiter,
  avatarUploadLimiter,
} from "../middlewares/rate-limiters";
import { validateBody, validateObjectIdParam } from "../middlewares/validate";
import { profileUpdateSchema } from "../validators/profile.schema";
import {
  getOrCreateProfile,
  updateProfile,
  setAvatarPath,
  serializePublicProfile,
  serializePrivateProfile,
} from "../services/profile.service";
import { receiveAvatarUpload, validateAndStoreAvatar, resolveAvatarPath } from "../middlewares/avatar-upload";
import { UserModel } from "../models/user.model";

const router = createAuthzRouter();

// ── Own profile ──
router.get("/me", [requireSession], profileReadLimiter, async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user!._id);
    return res.status(200).json(serializePrivateProfile(profile, req.user!));
  } catch (err) {
    next(err);
  }
});

router.patch("/me", [requireSession], requireCsrfToken, profileWriteLimiter, validateBody(profileUpdateSchema), async (req, res, next) => {
  try {
    const profile = await updateProfile(req.user!._id, req.validatedBody as Record<string, unknown>);
    return res.status(200).json(serializePrivateProfile(profile!, req.user!));
  } catch (err) {
    next(err);
  }
});

router.post("/me/avatar", [requireSession], requireCsrfToken, avatarUploadLimiter, receiveAvatarUpload, validateAndStoreAvatar, async (req, res, next) => {
  try {
    const profile = await setAvatarPath(req.user!._id, req.avatarFilename!);
    return res.status(200).json(serializePrivateProfile(profile!, req.user!));
  } catch (err) {
    next(err);
  }
});

router.get("/me/avatar", [requireSession], profileReadLimiter, async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user!._id);
    return streamAvatar(profile.avatarPath, res, next);
  } catch (err) {
    next(err);
  }
});

// ── Data export / import — operate exclusively on req.user._id ──
router.get("/me/export", [requireSession], exportLimiter, async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user!._id);
    // Explicit field list, never toObject()/populate() — those can carry
    // passwordHash/totpSecret/loginFailure that must never leave the server.
    return res.status(200).json({
      user: {
        email: req.user!.email,
        role: req.user!.role,
        sellerTier: req.user!.sellerTier,
        mfaEnabled: req.user!.mfaEnabled,
        createdAt: req.user!.createdAt,
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

// Reuses the exact same .strict() schema as PATCH /me — writing role/tier
// through this path is provably impossible.
router.post("/me/import", [requireSession], requireCsrfToken, profileWriteLimiter, validateBody(profileUpdateSchema), async (req, res, next) => {
  try {
    const profile = await updateProfile(req.user!._id, req.validatedBody as Record<string, unknown>);
    return res.status(200).json(serializePrivateProfile(profile!, req.user!));
  } catch (err) {
    next(err);
  }
});

// ── Public profile viewing — serializePublicProfile never includes
// sensitive fields, so this needs no ownership gate. ──
router.get("/:id", [requireSession], profileReadLimiter, validateObjectIdParam("id"), async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }
    const profile = await getOrCreateProfile(user._id);
    return res.status(200).json(serializePublicProfile(profile));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/avatar", [requireSession], profileReadLimiter, validateObjectIdParam("id"), async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }
    const profile = await getOrCreateProfile(user._id);
    return streamAvatar(profile.avatarPath, res, next);
  } catch (err) {
    next(err);
  }
});

function streamAvatar(storedFilename: string | null, res: Response, next: NextFunction) {
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
