import { prisma } from "@/lib/db";
import { buildRecognitionModal } from "@/lib/slack/messageBuilder";
import { getTokenForTeam } from "@/lib/slack/tokenStore";
import { recognitionService } from "@/lib/services/recognitionService";
import { verifySlackSignature } from "@/lib/slack/verifySignature";

function getTeamIdFromPayload(payload: any): string | undefined {
  return payload?.team?.id ?? payload?.user?.team_id ?? payload?.view?.team_id;
}

type OpenModalResult = { ok: true } | { ok: false; reason: string };

async function openRecognitionModal(teamId: string, slackUserId: string, triggerId: string): Promise<OpenModalResult> {
  const workspace = await prisma.workspace.findUnique({ where: { slackTeamId: teamId }, select: { id: true } });
  if (!workspace) {
    return { ok: false, reason: "Spotcoin is not connected for this Slack workspace." };
  }

  const [user, values] = await Promise.all([
    prisma.user.findFirst({
      where: {
        workspaceId: workspace.id,
        slackUserId,
        deletedAt: null,
      },
      select: { coinsToGive: true },
    }),
    prisma.companyValue.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: { id: true, name: true, emoji: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!user) {
    return {
      ok: false,
      reason:
        "Your Slack account is not linked to Spotcoin yet. Sign in at Spotcoin with the same email your admin invited, then try again.",
    };
  }
  if (values.length === 0) {
    return {
      ok: false,
      reason: "No active company values are set up yet. Ask a Spotcoin admin to add values in Admin → Settings.",
    };
  }

  try {
    const token = await getTokenForTeam(teamId);
    const { WebClient } = await import("@slack/web-api");
    const client = new WebClient(token);
    await client.views.open({
      trigger_id: triggerId,
      view: buildRecognitionModal(values, user.coinsToGive, slackUserId) as any,
    });
    return { ok: true };
  } catch (err) {
    console.error("Slack views.open failed", err);
    return {
      ok: false,
      reason: "Could not open the recognition form. Please try again in a moment or use `/spotcoin`.",
    };
  }
}

async function postEphemeralToResponseUrl(responseUrl: string, text: string) {
  const res = await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      response_type: "ephemeral",
      replace_original: false,
      text,
    }),
  });
  if (!res.ok) {
    console.error("Slack response_url ephemeral failed", res.status, await res.text());
  }
}

async function handleSubmitRecognition(payload: any) {
  const teamId: string | undefined = getTeamIdFromPayload(payload);
  const senderSlackId: string | undefined = payload.user?.id;
  if (!teamId || !senderSlackId) return;

  const workspace = await prisma.workspace.findUnique({
    where: { slackTeamId: teamId },
    select: { id: true, targetChannelId: true },
  });
  if (!workspace) return;

  const sender = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, slackUserId: senderSlackId, deletedAt: null },
    select: { id: true, name: true, username: true, email: true },
  });
  if (!sender) return;

  const recipientSlackId = payload.view?.state?.values?.recipient_block?.recipient?.selected_user;
  const message = payload.view?.state?.values?.message_block?.message?.value;
  const valueId = payload.view?.state?.values?.value_block?.value?.selected_option?.value;
  const coinAmountRaw = payload.view?.state?.values?.coin_block?.coin_amount?.selected_option?.value;
  if (!recipientSlackId || !message || !valueId || !coinAmountRaw) return;

  const recipient = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, slackUserId: recipientSlackId, deletedAt: null },
    select: { id: true, name: true, username: true, email: true, slackUserId: true },
  });
  if (!recipient) return;

  const coinAmount = Number(coinAmountRaw);
  await recognitionService.send(sender.id, {
    recipientId: recipient.id,
    message,
    valueId,
    coinAmount,
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

  const form = new URLSearchParams(rawBody);
  const payloadRaw = form.get("payload");
  if (!payloadRaw) return new Response("", { status: 200 });
  const payload = JSON.parse(payloadRaw);

  if (payload.type === "block_actions") {
    const action = payload.actions?.[0];
    if (action?.action_id === "open_recognition_modal") {
      const teamId: string | undefined = getTeamIdFromPayload(payload);
      const slackUserId: string | undefined = payload.user?.id;
      const triggerId: string | undefined = payload.trigger_id;
      const responseUrl: string | undefined = typeof payload.response_url === "string" ? payload.response_url : undefined;
      if (teamId && slackUserId && triggerId) {
        try {
          const result = await openRecognitionModal(teamId, slackUserId, triggerId);
          if (!result.ok && responseUrl) {
            void postEphemeralToResponseUrl(responseUrl, result.reason);
          }
        } catch (err) {
          console.error("Slack interaction open modal handler failed", err);
          if (responseUrl) {
            void postEphemeralToResponseUrl(
              responseUrl,
              "Something went wrong opening recognition. Please try again or use `/spotcoin`.",
            );
          }
        }
      }
    }
    return new Response("", { status: 200 });
  }

  if (payload.type === "view_submission" && payload.view?.callback_id === "submit_recognition") {
    try {
      await handleSubmitRecognition(payload);
    } catch (err) {
      console.error("Slack interaction submit handler failed", err);
      return new Response(
        JSON.stringify({
          response_action: "errors",
          errors: {
            message_block: "Could not send recognition. Check balances and try again.",
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }
    return new Response(JSON.stringify({ response_action: "clear" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("", { status: 200 });
}
