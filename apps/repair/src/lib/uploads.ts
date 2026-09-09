import path from "path";

/**
 * Absolute directory for uploaded files.
 * Local default: <cwd>/public/uploads
 * Fly: set UPLOAD_DIR=/data/uploads and mount the volume there
 * (never mount a Fly volume over public/ — Next scans public and dies on lost+found).
 */
export function getUploadsRoot(): string {
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()) {
    return path.resolve(process.env.UPLOAD_DIR.trim());
  }
  return path.join(process.cwd(), "public", "uploads");
}

/** Map a public URL path like /uploads/repair_ticket/id/file.jpg → absolute file path. */
export function resolveUploadAbsolutePath(storagePath: string): string | null {
  const normalized = storagePath.replace(/\\/g, "/");
  if (!normalized.startsWith("/uploads/")) return null;
  const relative = normalized.slice("/uploads/".length);
  if (!relative || relative.includes("..")) return null;
  const abs = path.join(getUploadsRoot(), relative);
  const root = getUploadsRoot();
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}
