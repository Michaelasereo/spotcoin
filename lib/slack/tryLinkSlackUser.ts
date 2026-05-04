import type { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/db";

export type TryLinkSlackUserResult =
  | { ok: true; outcome: "already_linked" | "linked_now" }
  | { ok: false; code: "no_slack_email" | "no_spotcoin_user_for_email" | "account_has_other_slack" };

/**
 * If no user row yet has this Slack user id, fetch the Slack profile email and
 * attach slackUserId to the Spotcoin user in this workspace with the same email.
 * Requires bot scopes users:read and users:read.email.
 */
export async function tryLinkSlackUserFromProfile(
  workspaceId: string,
  slackUserId: string,
  client: WebClient,
): Promise<TryLinkSlackUserResult> {
  const existing = await prisma.user.findFirst({
    where: { workspaceId, slackUserId, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, outcome: "already_linked" };
  }

  const info = await client.users.info({ user: slackUserId });
  if (!info.ok || !info.user?.profile?.email?.trim()) {
    return { ok: false, code: "no_slack_email" };
  }

  const email = info.user.profile.email.trim();

  const user = await prisma.user.findFirst({
    where: {
      workspaceId,
      email: { equals: email, mode: "insensitive" },
      deletedAt: null,
    },
    select: { id: true, slackUserId: true },
  });
  if (!user) {
    return { ok: false, code: "no_spotcoin_user_for_email" };
  }
  if (user.slackUserId && user.slackUserId !== slackUserId) {
    return { ok: false, code: "account_has_other_slack" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { slackUserId },
  });
  return { ok: true, outcome: "linked_now" };
}
