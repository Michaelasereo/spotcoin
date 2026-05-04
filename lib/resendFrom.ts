import { env } from "@/lib/env";

/** Resend sandbox default; production should set `RESEND_FROM` to a verified-domain address in Resend. */
const DEFAULT_RESEND_FROM = "Spotcoin <onboarding@resend.dev>";

export function resendFromAddress() {
  const from = env.RESEND_FROM?.trim();
  return from && from.length > 0 ? from : DEFAULT_RESEND_FROM;
}
