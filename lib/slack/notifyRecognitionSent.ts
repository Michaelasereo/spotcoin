import { prisma } from "@/lib/db";
import { publicFeedDisplayName } from "@/lib/publicDisplayName";
import { sendPublicPost, sendRecipientDM } from "@/lib/slack/notifier";

/**
 * Posts recognition to the workspace Slack channel and recipient DM when Slack is configured.
 * Persists `slackTs` on the recognition row after a successful public channel post (for idempotent backfills).
 * Safe to await or fire-and-forget; errors are logged inside notifier helpers.
 * @returns whether the public channel post succeeded (and `slackTs` was stored).
 */
export async function notifyRecognitionSentToSlack(recognitionId: string, workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { slackTeamId: true, targetChannelId: true },
  });
  if (!workspace?.slackTeamId) {
    return false;
  }

  const rec = await prisma.recognition.findFirst({
    where: { id: recognitionId, workspaceId },
    include: {
      sender: { select: { username: true, email: true } },
      recipient: { select: { username: true, email: true, slackUserId: true } },
      value: { select: { name: true, emoji: true } },
    },
  });
  if (!rec) {
    return false;
  }

  if (rec.slackTs) {
    return true;
  }

  const slackCtx = {
    slackTeamId: workspace.slackTeamId,
    targetChannelId: workspace.targetChannelId,
  };

  const senderForSlack = {
    name: publicFeedDisplayName({ username: rec.sender.username, email: rec.sender.email }),
  };
  const recipientForSlack = {
    name: publicFeedDisplayName({ username: rec.recipient.username, email: rec.recipient.email }),
    slackUserId: rec.recipient.slackUserId,
  };

  const recognitionPayload = { message: rec.message, coinAmount: rec.coinAmount };

  const ts = await sendPublicPost(recognitionPayload, senderForSlack, recipientForSlack, rec.value, slackCtx);
  await sendRecipientDM(recognitionPayload, senderForSlack, recipientForSlack, rec.value, slackCtx);

  if (ts) {
    await prisma.recognition.update({
      where: { id: recognitionId },
      data: { slackTs: ts },
    });
    return true;
  }
  return false;
}
