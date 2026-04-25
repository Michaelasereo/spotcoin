import { WebClient } from "@slack/web-api";
import { buildPublicPost, buildRecipientDM } from "@/lib/slack/messageBuilder";
import { getTokenForTeam } from "@/lib/slack/tokenStore";

type WorkspaceSlackContext = {
  slackTeamId: string | null;
  targetChannelId: string | null;
};

export async function sendPublicPost(
  recognition: { message: string; coinAmount: number },
  sender: { name: string },
  recipient: { name: string },
  value: { name: string; emoji: string },
  workspace: WorkspaceSlackContext,
) {
  if (!workspace.slackTeamId || !workspace.targetChannelId) return;

  try {
    const token = await getTokenForTeam(workspace.slackTeamId);
    const client = new WebClient(token);
    await client.chat.postMessage({
      channel: workspace.targetChannelId,
      text: `${sender.name} recognized ${recipient.name}`,
      blocks: buildPublicPost(sender, recipient, recognition, value) as any,
    });
  } catch (err) {
    console.error("Failed to send public Slack post", err);
  }
}

export async function sendRecipientDM(
  recognition: { message: string; coinAmount: number },
  sender: { name: string },
  recipient: { name: string; slackUserId?: string | null },
  value: { name: string; emoji: string },
  workspace: WorkspaceSlackContext,
) {
  if (!workspace.slackTeamId || !recipient.slackUserId) return;

  try {
    const token = await getTokenForTeam(workspace.slackTeamId);
    const client = new WebClient(token);
    await client.chat.postMessage({
      channel: recipient.slackUserId,
      text: `You were recognized by ${sender.name}`,
      blocks: buildRecipientDM(sender, recipient, recognition, value) as any,
    });
  } catch (err) {
    console.error("Failed to send recipient Slack DM", err);
  }
}

export async function sendMonthlyRefillDM(
  user: { name: string; slackUserId?: string | null },
  workspace: WorkspaceSlackContext & { monthlyAllowance?: number },
) {
  if (!workspace.slackTeamId || !user.slackUserId) return;

  try {
    const token = await getTokenForTeam(workspace.slackTeamId);
    const client = new WebClient(token);
    await client.chat.postMessage({
      channel: user.slackUserId,
      text: `Your Spotcoin balance has been refilled to ${workspace.monthlyAllowance ?? 0} coin(s).`,
    });
  } catch (err) {
    console.error("Failed to send monthly refill DM", err);
  }
}

export async function sendLowBalanceDM(
  user: { name: string; slackUserId?: string | null; coinsToGive: number },
  workspace: WorkspaceSlackContext,
) {
  if (!workspace.slackTeamId || !user.slackUserId) return;
  if (user.coinsToGive !== 1) return;

  try {
    const token = await getTokenForTeam(workspace.slackTeamId);
    const client = new WebClient(token);
    await client.chat.postMessage({
      channel: user.slackUserId,
      text: "Heads up: you have 1 Spotcoin left this month.",
    });
  } catch (err) {
    console.error("Failed to send low balance DM", err);
  }
}

export async function sendDisengagedNudgeDM(
  user: { name: string; slackUserId?: string | null },
  workspace: WorkspaceSlackContext,
) {
  if (!workspace.slackTeamId || !user.slackUserId) return;

  try {
    const token = await getTokenForTeam(workspace.slackTeamId);
    const client = new WebClient(token);
    await client.chat.postMessage({
      channel: user.slackUserId,
      text: `Hi ${user.name}, your team would love to see your next Spotcoin recognition this week.`,
    });
  } catch (err) {
    console.error("Failed to send disengagement nudge DM", err);
  }
}
