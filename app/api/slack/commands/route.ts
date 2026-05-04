import { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/db";
import { buildRecognitionModal } from "@/lib/slack/messageBuilder";
import { getTokenForTeam } from "@/lib/slack/tokenStore";
import { verifySlackSignature } from "@/lib/slack/verifySignature";

async function handleSpotcoinCommand(params: URLSearchParams) {
  const teamId = params.get("team_id");
  const slackUserId = params.get("user_id");
  const triggerId = params.get("trigger_id");
  if (!teamId || !slackUserId || !triggerId) return;

  const workspace = await prisma.workspace.findUnique({
    where: { slackTeamId: teamId },
    select: { id: true },
  });
  if (!workspace) return;

  const user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace.id,
      slackUserId,
      deletedAt: null,
    },
    select: { coinsToGive: true },
  });
  if (!user) return;

  const values = await prisma.companyValue.findMany({
    where: { workspaceId: workspace.id, isActive: true },
    select: { id: true, name: true, emoji: true },
    orderBy: { name: "asc" },
  });

  const token = await getTokenForTeam(teamId);
  const client = new WebClient(token);

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
