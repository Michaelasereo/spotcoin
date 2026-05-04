import { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/db";
import { buildRecognitionModal } from "@/lib/slack/messageBuilder";
import { getTokenForTeam } from "@/lib/slack/tokenStore";
import { tryLinkSlackUserFromProfile } from "@/lib/slack/tryLinkSlackUser";
import { verifySlackSignature } from "@/lib/slack/verifySignature";

async function postSlashEphemeral(responseUrl: string, text: string) {
  const res = await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ response_type: "ephemeral", replace_original: false, text }),
  });
  if (!res.ok) {
    console.error("Slack slash response_url failed", res.status, await res.text());
  }
}

async function handleSpotcoinCommand(params: URLSearchParams) {
  const teamId = params.get("team_id");
  const slackUserId = params.get("user_id");
  const triggerId = params.get("trigger_id");
  const responseUrl = params.get("response_url");
  if (!teamId || !slackUserId || !triggerId) return;

  const workspace = await prisma.workspace.findUnique({
    where: { slackTeamId: teamId },
    select: { id: true },
  });
  if (!workspace) return;

  let token: string;
  try {
    token = await getTokenForTeam(teamId);
  } catch {
    if (responseUrl) {
      void postSlashEphemeral(responseUrl, "Spotcoin Slack bot is not installed for this workspace.");
    }
    return;
  }

  const client = new WebClient(token);

  let user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace.id,
      slackUserId,
      deletedAt: null,
    },
    select: { coinsToGive: true },
  });

  if (!user) {
    const link = await tryLinkSlackUserFromProfile(workspace.id, slackUserId, client);
    if (!link.ok && responseUrl) {
      const text =
        link.code === "no_slack_email"
          ? "Slack did not share an email on your profile. Add a verified email in Slack, then try `/spotcoin` again."
          : link.code === "account_has_other_slack"
            ? "This Spotcoin account is already linked to a different Slack member."
            : "No Spotcoin user matches your Slack email. Sign in at Spotcoin with the same email your admin invited, then try again.";
      void postSlashEphemeral(responseUrl, text);
      return;
    }
    user = await prisma.user.findFirst({
      where: {
        workspaceId: workspace.id,
        slackUserId,
        deletedAt: null,
      },
      select: { coinsToGive: true },
    });
  }

  if (!user) {
    if (responseUrl) {
      void postSlashEphemeral(
        responseUrl,
        "Your Slack account is not linked to Spotcoin yet. Sign in with the same email your admin invited, then try again.",
      );
    }
    return;
  }

  const values = await prisma.companyValue.findMany({
    where: { workspaceId: workspace.id, isActive: true },
    select: { id: true, name: true, emoji: true },
    orderBy: { name: "asc" },
  });
  if (values.length === 0) {
    if (responseUrl) {
      void postSlashEphemeral(
        responseUrl,
        "No active company values are set up yet. Ask a Spotcoin admin to add values in Admin → Settings.",
      );
    }
    return;
  }

  await client.views.open({
    trigger_id: triggerId,
    view: buildRecognitionModal(values, user.coinsToGive, slackUserId) as any,
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isValid = verifySlackSignature(
    rawBody,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature"),
  );
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const command = params.get("command");

  if (command === "/spotcoin") {
    try {
      await handleSpotcoinCommand(params);
    } catch (err) {
      console.error("Slack command handler failed", err);
    }
  }

  return new Response("", { status: 200 });
}
