import crypto from "node:crypto";
import { env } from "@/lib/env";

export function verifySlackSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
) {
  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (Number.isNaN(ts)) return false;

  // Reject replayed requests older than 5 minutes.
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 60 * 5) {
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const digest = crypto
    .createHmac("sha256", env.SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest("hex");

  const expected = `v0=${digest}`;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
