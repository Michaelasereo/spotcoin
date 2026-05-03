/**
 * Prevents open redirects: only same-origin relative paths are allowed.
 */
export function safeInternalPath(raw: string | null): string | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("\\") || trimmed.includes("\0")) {
    return null;
  }
  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (pathOnly.includes("..")) {
    return null;
  }
  return trimmed;
}
