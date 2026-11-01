import crypto from "node:crypto";

// File links handed to the browser carry an HMAC so /api/file only serves
// files that this site's chat produced, not any file in the Anthropic workspace.
function secret() {
  return process.env.HIRD_FILE_SECRET || process.env.ANTHROPIC_API_KEY || "";
}

export function signFileId(fileId) {
  const mac = crypto.createHmac("sha256", secret()).update(fileId).digest("base64url");
  return `${fileId}.${mac}`;
}

export function verifyFileToken(token) {
  if (typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const fileId = token.slice(0, dot);
  if (!/^file_[A-Za-z0-9_-]{6,}$/.test(fileId)) return null;
  const expected = Buffer.from(signFileId(fileId));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return fileId;
}
