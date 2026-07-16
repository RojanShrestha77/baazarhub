import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import multer from "multer";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

export const VERIFICATION_UPLOAD_DIR = path.resolve(process.cwd(), "var", "uploads", "verification");
export const MAX_VERIFICATION_BYTES = 15 * 1024 * 1024;
export const MAX_DOCS_PER_REQUEST = 5;

// Allowlist — only these MIME types accepted. Denylist is not a control.
const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VERIFICATION_BYTES, files: MAX_DOCS_PER_REQUEST },
});

const docsField = upload.array("documents", MAX_DOCS_PER_REQUEST);

export function receiveVerificationDocs(req, res, next) {
  docsField(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "A document exceeds the maximum allowed size" });
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: `A verification request can have at most ${MAX_DOCS_PER_REQUEST} documents` });
      }
      return res.status(400).json({ error: "Invalid upload" });
    }
    next();
  });
}

export async function validateAndStoreVerificationDocs(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "At least one document is required" });
    }

    // Sniff every file BEFORE writing — all-or-nothing batch
    const detections = [];
    for (const file of files) {
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected || !(detected.mime in ALLOWED_TYPES)) {
        return res.status(400).json({ error: `Unsupported file type: ${detected ? detected.mime : "unknown"}. Allowed: PDF, JPEG, PNG.` });
      }
      detections.push(detected);
    }

    await fs.mkdir(VERIFICATION_UPLOAD_DIR, { recursive: true });

    const documents = [];
    for (let i = 0; i < files.length; i++) {
      const ext = ALLOWED_TYPES[detections[i].mime];
      let buffer = files[i].buffer;

      // Strip EXIF from images (sharp throws on PDF, so we catch that)
      if (detections[i].mime.startsWith("image/")) {
        try {
          buffer = await sharp(buffer).rotate().toBuffer();
        } catch {
          // If sharp fails (e.g. truncated image), reject
          return res.status(400).json({ error: "Invalid or corrupted image file" });
        }
      }

      const filename = `${crypto.randomUUID()}.${ext}`;
      const destPath = path.join(VERIFICATION_UPLOAD_DIR, filename);

      if (!destPath.startsWith(VERIFICATION_UPLOAD_DIR + path.sep)) {
        return res.status(400).json({ error: "Invalid upload target" });
      }

      await fs.writeFile(destPath, buffer);

      documents.push({
        filename,
        originalName: files[i].originalname,
        mime: detections[i].mime,
        size: buffer.length,
      });
    }

    req.verificationDocuments = documents;
    next();
  } catch (err) {
    next(err);
  }
}

export function resolveVerificationDocPath(filename) {
  if (!filename || typeof filename !== "string") return null;
  // Prevent path traversal
  if (filename.includes("..") || filename.includes(path.sep)) return null;
  const resolved = path.join(VERIFICATION_UPLOAD_DIR, filename);
  if (!resolved.startsWith(VERIFICATION_UPLOAD_DIR + path.sep)) return null;
  return resolved;
}
