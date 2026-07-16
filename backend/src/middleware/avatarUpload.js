// Avatar upload (Phase 2, Slice 3): content-type validated by sniffing the
// actual bytes (never the Content-Type header or the client's filename),
// size-capped, filename entirely server-generated (no path traversal
// surface), stored outside src/ and outside anything Express serves
// statically (no express.static is mounted anywhere in this app — see
// app.js — avatar retrieval is always a dedicated authenticated route that
// reads and streams the file itself).
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

export const UPLOAD_DIR = path.resolve(process.cwd(), "var", "uploads", "avatars");
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const EXT_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Memory storage, not disk storage — multer never touches the filesystem
// itself, so the write path (destination directory, filename) is entirely
// ours to control below, not multer's default (which would use the
// client-influenced original filename).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
});

const singleAvatarField = upload.single("avatar");

// Wraps multer's callback-style error surface (file-too-large, wrong
// field, etc.) as a normal Express middleware returning JSON, so route
// declarations don't need to know multer's internals.
export function receiveAvatarUpload(req, res, next) {
  singleAvatarField(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "Avatar exceeds the maximum allowed size" });
      }
      return res.status(400).json({ error: "Invalid upload" });
    }
    next();
  });
}

// Sniffs the actual file bytes (magic numbers), never trusting the
// Content-Type header multer captured from the multipart request or the
// client's original filename/extension — both are attacker-controlled.
export async function validateAndStoreAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "avatar file is required" });
    }

    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !(detected.mime in EXT_BY_MIME)) {
      return res.status(400).json({ error: "Unsupported or unrecognized image type" });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Filename is entirely server-generated: the owning user's id, a
    // random UUID, and the sniffed (not client-supplied) extension — the
    // client's original filename is never read for anything.
    const filename = `${req.user._id}-${crypto.randomUUID()}.${EXT_BY_MIME[detected.mime]}`;
    const destPath = path.join(UPLOAD_DIR, filename);

    // Defense in depth: the filename above can't traverse by construction,
    // but re-verify the resolved path never escapes UPLOAD_DIR before
    // writing, in case that construction is ever weakened later.
    if (!destPath.startsWith(UPLOAD_DIR + path.sep)) {
      return res.status(400).json({ error: "Invalid upload target" });
    }

    await fs.writeFile(destPath, req.file.buffer);

    req.avatarFilename = filename;
    req.avatarMime = detected.mime;
    next();
  } catch (err) {
    next(err);
  }
}

// Resolves a stored filename to a safe on-disk path, or null if it would
// escape UPLOAD_DIR — used by the avatar-serving route, never trusts a
// filename that didn't come from a Profile document this server wrote.
export function resolveAvatarPath(filename) {
  if (!filename) return null;
  const resolved = path.join(UPLOAD_DIR, filename);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) return null;
  return resolved;
}
