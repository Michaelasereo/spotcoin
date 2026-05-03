import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/** Allow time to complete Slack’s OAuth screens (App Directory / multi-step). */
const STATE_TTL_MS = 30 * 60 * 1000;

type SlackOAuthStatePayload = {
  userId: string;
  workspaceId: string;
  issuedAt: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", env.SLACK_STATE_SECRET).update(payload).digest("base64url");
}

export function createSlackOAuthState(userId: string, workspaceId: string) {
  const payload: SlackOAuthStatePayload = {
    userId,
    workspaceId,
    issuedAt: Date.now(),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySlackOAuthState(state: string | null) {
  if (!state) return null;

  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let payload: SlackOAuthStatePayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as SlackOAuthStatePayload;
  } catch {
    return null;
  }

  if (!payload.userId || !payload.workspaceId || !payload.issuedAt) {
    return null;
  }

  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    return null;
  }

  return payload;
}
