import { prisma } from "@/lib/db";
import { buildRecognitionModal } from "@/lib/slack/messageBuilder";
import { getTokenForTeam } from "@/lib/slack/tokenStore";
import { recognitionService } from "@/lib/services/recognitionService";
import { sendPublicPost, sendRecipientDM } from "@/lib/slack/notifier";
import { verifySlackSignature } from "@/lib/slack/verifySignature";

async function openRecognitionModal(teamId: string, slackUserId: string, triggerId: string) {
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
  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(token);
  await client.views.open({
    trigger_id: triggerId,
    view: buildRecognitionModal(values, user.coinsToGive, slackUserId) as any,
  });
}

async function handleSubmitRecognition(payload: any) {
  const teamId: string | undefined = payload.team?.id;
  const senderSlackId: string | undefined = payload.user?.id;
  if (!teamId || !senderSlackId) return;

  const workspace = await prisma.workspace.findUnique({
    where: { slackTeamId: teamId },
    select: { id: true, targetChannelId: true },
  });
  if (!workspace) return;

  const sender = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, slackUserId: senderSlackId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!sender) return;

  const recipientSlackId = payload.view?.state?.values?.recipient_block?.recipient?.selected_user;
  const message = payload.view?.state?.values?.message_block?.message?.value;
  const valueId = payload.view?.state?.values?.value_block?.value?.selected_option?.value;
  const coinAmountRaw = payload.view?.state?.values?.coin_block?.coin_amount?.selected_option?.value;
  if (!recipientSlackId || !message || !valueId || !coinAmountRaw) return;

  const recipient = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, slackUserId: recipientSlackId, deletedAt: null },
    select: { id: true, name: true, slackUserId: true },
  });
  if (!recipient) return;

  const coinAmount = Number(coinAmountRaw);
  const recognition = await recognitionService.send(sender.id, {
    recipientId: recipient.id,
    message,
    valueId,
    coinAmount,
  });

  const value = await prisma.companyValue.findUnique({
    where: { id: valueId },
    select: { name: true, emoji: true },
  });
  if (!value) return;

  await sendPublicPost(recognition, sender, recipient, value, {
    slackTeamId: teamId,
    targetChannelId: workspace.targetChannelId,
  });
  await sendRecipientDM(recognition, sender, recipient, value, {
    slackTeamId: teamId,
    targetChannelId: workspace.targetChannelId,
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
      const teamId: string | undefined = payload.team?.id;
      const slackUserId: string | undefined = payload.user?.id;
      const triggerId: string | undefined = payload.trigger_id;
      if (teamId && slackUserId && triggerId) {
        void openRecognitionModal(teamId, slackUserId, triggerId).catch((err) => {
          console.error("Slack interaction open modal handler failed", err);
        });
      }
    }
    return new Response("", { status: 200 });
  }

  if (payload.type === "view_submission" && payload.view?.callback_id === "submit_recognition") {
    void handleSubmitRecognition(payload).catch((err) => {
      console.error("Slack interaction submit handler failed", err);
    });
    return new Response(JSON.stringify({ response_action: "clear" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("", { status: 200 });
}
