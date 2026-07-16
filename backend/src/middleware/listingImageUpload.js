// Listing image upload (Phase 3, Slice 3) — clones the exact hardening
// pattern from Phase 2's avatarUpload.js: sniff real bytes, cap size,
// server-generated filenames, no path traversal, stored outside webroot
// and outside any express.static mount. The one thing this adds beyond
// avatars: every image is re-encoded through sharp before it's written,
// which strips EXIF/IPTC/XMP metadata. Seller photos taken on a phone
// commonly embed GPS coordinates — in a marketplace where buyer and
// seller arrange in-person pickup, that's a location leak specific to
// this domain, not a generic "images might carry metadata" footnote. See
// docs/security-decisions.md.
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import multer from "multer";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

export const UPLOAD_DIR = path.resolve(process.cwd(), "var", "uploads", "listings");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_LISTING = 6;

const EXT_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_LISTING },
});

const imagesField = upload.array("images", MAX_IMAGES_PER_LISTING);

export function receiveListingImages(req, res, next) {
  imagesField(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "An image exceeds the maximum allowed size" });
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: `A listing can have at most ${MAX_IMAGES_PER_LISTING} images` });
      }
      return res.status(400).json({ error: "Invalid upload" });
    }
    next();
  });
}

// req.listing must already be set (the route resolves it via
// requireOwnership before this runs) — used to enforce the per-listing
// cap across multiple upload requests over time, not just within a
// single request.
export async function validateAndStoreListingImages(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const existingCount = req.listing.images.length;
    if (existingCount + files.length > MAX_IMAGES_PER_LISTING) {
      return res.status(400).json({
        error: `A listing can have at most ${MAX_IMAGES_PER_LISTING} images (${existingCount} already uploaded)`,
      });
    }

    // Sniff every file BEFORE writing any of them — an all-or-nothing
    // batch, so a mixed valid/invalid upload doesn't leave partial state.
    const detections = [];
    for (const file of files) {
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected || !(detected.mime in EXT_BY_MIME)) {
        return res.status(400).json({ error: "Unsupported or unrecognized image type" });
      }
      detections.push(detected);
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const filenames = [];
    for (let i = 0; i < files.length; i++) {
      const ext = EXT_BY_MIME[detections[i].mime];
      // Re-encode through sharp — rotate() auto-orients using the EXIF
      // orientation tag BEFORE it's stripped (so re-encoded images don't
      // end up sideways), resize caps dimensions (incidental defense
      // against decompression-bomb-style huge images plus storage
      // sanity), and the output carries no metadata unless .withMetadata()
      // is called, which it never is here. This also double-checks the
      // upload is a genuinely decodable image beyond magic-byte sniffing
      // — sharp throws on bytes that sniff as an image but don't decode.
      const reencoded = await sharp(files[i].buffer)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .toFormat(ext === "jpg" ? "jpeg" : ext)
        .toBuffer();

      // Filename is entirely server-generated: the listing id, a random
      // UUID, and the sniffed extension — the client's original filename
      // is never read for anything.
      const filename = `${req.listing._id}-${crypto.randomUUID()}.${ext}`;
      const destPath = path.join(UPLOAD_DIR, filename);

      // Defense in depth: can't traverse by construction, re-verify anyway.
      if (!destPath.startsWith(UPLOAD_DIR + path.sep)) {
        return res.status(400).json({ error: "Invalid upload target" });
      }

      await fs.writeFile(destPath, reencoded);
      filenames.push(filename);
    }

    req.uploadedImageFilenames = filenames;
    next();
  } catch (err) {
    next(err);
  }
}

export function resolveListingImagePath(filename) {
  if (!filename) return null;
  const resolved = path.join(UPLOAD_DIR, filename);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) return null;
  return resolved;
}
