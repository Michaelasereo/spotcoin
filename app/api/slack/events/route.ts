import { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/db";
import { publicFeedDisplayName } from "@/lib/publicDisplayName";
import { getTokenForTeam } from "@/lib/slack/tokenStore";
import { tryLinkSlackUserFromProfile } from "@/lib/slack/tryLinkSlackUser";
import { verifySlackSignature } from "@/lib/slack/verifySignature";
import { buildHomeView } from "@/lib/slack/homeView";

async function handleAppHomeOpened(payload: any) {
  const event = payload.event;
  const teamId: string | undefined = payload.team_id;
  const slackUserId: string | undefined = event?.user;
  if (!teamId || !slackUserId) return;

  const workspace = await prisma.workspace.findUnique({
    where: { slackTeamId: teamId },
    select: { id: true, tokenValueNaira: true },
  });
  if (!workspace) return;

  let token: string;
  try {
    token = await getTokenForTeam(teamId);
  } catch {
    return;
  }
  const client = new WebClient(token);

  let user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace.id,
      slackUserId,
      deletedAt: null,
    },
    select: {
      coinsToGive: true,
      spotTokensEarned: true,
      sentRecognitions: {
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          recipient: { select: { username: true, email: true } },
          value: { select: { emoji: true, name: true } },
        },
      },
    },
  });
  if (!user) {
    const link = await tryLinkSlackUserFromProfile(workspace.id, slackUserId, client);
    if (link.ok) {
      user = await prisma.user.findFirst({
        where: {
          workspaceId: workspace.id,
          slackUserId,
          deletedAt: null,
        },
        select: {
          coinsToGive: true,
          spotTokensEarned: true,
          sentRecognitions: {
            take: 3,
            orderBy: { createdAt: "desc" },
            include: {
              recipient: { select: { username: true, email: true } },
              value: { select: { emoji: true, name: true } },
            },
          },
        },
      });
    }
  }
  if (!user) return;

  const recent = user.sentRecognitions.map((item) => ({
    text: `${item.value.emoji} → ${publicFeedDisplayName(item.recipient)} · ${item.coinAmount} coin(s)`,
  }));

  await client.views.publish({
    user_id: slackUserId,
    view: buildHomeView({
      coinsToGive: user.coinsToGive,
      spotTokensEarned: user.spotTokensEarned,
      tokenValueNaira: workspace.tokenValueNaira,
      recent,
    }) as any,
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

  const payload = JSON.parse(rawBody);

  if (payload.type === "url_verification") {
    return new Response(JSON.stringify({ challenge: payload.challenge }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (payload.event?.type === "app_home_opened") {
    try {
      await handleAppHomeOpened(payload);
    } catch (err) {
      console.error("Slack app_home_opened handler failed", err);
    }
  }

  return new Response("ok", { status: 200 });
}
