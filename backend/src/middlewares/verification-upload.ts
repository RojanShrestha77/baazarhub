import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import multer from "multer";
import sharp from "sharp";
import { fromBuffer as fileTypeFromBuffer } from "file-type";
import { Request, Response, NextFunction } from "express";

export const VERIFICATION_UPLOAD_DIR = path.resolve(process.cwd(), "var", "uploads", "verification");
export const MAX_VERIFICATION_BYTES = 15 * 1024 * 1024;
export const MAX_DOCS_PER_REQUEST = 5;

// Allowlist — only these MIME types accepted. A denylist is not a control.
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_VERIFICATION_BYTES, files: MAX_DOCS_PER_REQUEST } });
const docsField = upload.array("documents", MAX_DOCS_PER_REQUEST);

async function detectMime(buffer: Buffer): Promise<string | null> {
  const detected = await fileTypeFromBuffer(buffer);
  return detected ? detected.mime : null;
}

export function receiveVerificationDocs(req: Request, res: Response, next: NextFunction) {
  docsField(req, res, (err: unknown) => {
    if (err) {
      const code = (err as { code?: string }).code;
      if (code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "A document exceeds the maximum allowed size" });
      }
      if (code === "LIMIT_FILE_COUNT" || code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: `A verification request can have at most ${MAX_DOCS_PER_REQUEST} documents` });
      }
      return res.status(400).json({ error: "Invalid upload" });
    }
    next();
  });
}

export async function validateAndStoreVerificationDocs(req: Request, res: Response, next: NextFunction) {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "At least one document is required" });
    }

    // Sniff every file BEFORE writing — all-or-nothing batch.
    const mimes: string[] = [];
    for (const file of files) {
      const mime = await detectMime(file.buffer);
      if (!mime || !(mime in ALLOWED_TYPES)) {
        return res.status(400).json({ error: `Unsupported file type: ${mime ?? "unknown"}. Allowed: PDF, JPEG, PNG.` });
      }
      mimes.push(mime);
    }

    await fs.mkdir(VERIFICATION_UPLOAD_DIR, { recursive: true });

    const documents = [];
    for (let i = 0; i < files.length; i++) {
      const ext = ALLOWED_TYPES[mimes[i]];
      let buffer = files[i].buffer;

      // Strip EXIF from images (sharp throws on PDF, so guard that).
      if (mimes[i].startsWith("image/")) {
        try {
          buffer = await sharp(buffer).rotate().toBuffer();
        } catch {
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
        mime: mimes[i],
        size: buffer.length,
      });
    }

    req.verificationDocuments = documents;
    next();
  } catch (err) {
    next(err);
  }
}

export function resolveVerificationDocPath(filename?: string | null): string | null {
  if (!filename || typeof filename !== "string") return null;
  if (filename.includes("..") || filename.includes(path.sep)) return null;
  const resolved = path.join(VERIFICATION_UPLOAD_DIR, filename);
  if (!resolved.startsWith(VERIFICATION_UPLOAD_DIR + path.sep)) return null;
  return resolved;
}
