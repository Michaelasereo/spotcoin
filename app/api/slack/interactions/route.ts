import { prisma } from "@/lib/db";
import { buildRecognitionModal } from "@/lib/slack/messageBuilder";
import { getTokenForTeam } from "@/lib/slack/tokenStore";
import { tryLinkSlackUserFromProfile } from "@/lib/slack/tryLinkSlackUser";
import { recognitionService } from "@/lib/services/recognitionService";
import { verifySlackSignature } from "@/lib/slack/verifySignature";

function getTeamIdFromPayload(payload: any): string | undefined {
  return payload?.team?.id ?? payload?.user?.team_id ?? payload?.view?.team_id;
}

type OpenModalResult = { ok: true } | { ok: false; reason: string };

function reasonForLinkFailure(code: "no_slack_email" | "no_spotcoin_user_for_email" | "account_has_other_slack"): string {
  switch (code) {
    case "no_slack_email":
      return "Slack did not share an email on your profile. Add a verified email in Slack (Profile → Contact information), then try again.";
    case "account_has_other_slack":
      return "This Spotcoin account is already linked to a different Slack member. Ask an admin if you need help.";
    case "no_spotcoin_user_for_email":
    default:
      return "No Spotcoin user matches your Slack email. Sign in at Spotcoin with the same email your admin invited, then try again.";
  }
}

async function openRecognitionModal(teamId: string, slackUserId: string, triggerId: string): Promise<OpenModalResult> {
  const workspace = await prisma.workspace.findUnique({ where: { slackTeamId: teamId }, select: { id: true } });
  if (!workspace) {
    return { ok: false, reason: "Spotcoin is not connected for this Slack workspace." };
  }

  let token: string;
  try {
    token = await getTokenForTeam(teamId);
  } catch {
    return { ok: false, reason: "Spotcoin Slack bot is not installed for this workspace." };
  }

  const { WebClient } = await import("@slack/web-api");
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
    try {
      const link = await tryLinkSlackUserFromProfile(workspace.id, slackUserId, client);
      if (!link.ok) {
        return { ok: false, reason: reasonForLinkFailure(link.code) };
      }
      user = await prisma.user.findFirst({
        where: {
          workspaceId: workspace.id,
          slackUserId,
          deletedAt: null,
        },
        select: { coinsToGive: true },
      });
    } catch (err) {
      console.error("Slack tryLinkSlackUserFromProfile failed", err);
      return {
        ok: false,
        reason: "Could not verify your Slack profile. Please try again or use `/spotcoin`.",
      };
    }
  }

  if (!user) {
    return {
      ok: false,
      reason:
        "Your Slack account is not linked to Spotcoin yet. Sign in at Spotcoin with the same email your admin invited, then try again.",
    };
  }

  const values = await prisma.companyValue.findMany({
    where: { workspaceId: workspace.id, isActive: true },
    select: { id: true, name: true, emoji: true },
    orderBy: { name: "asc" },
  });
  if (values.length === 0) {
    return {
      ok: false,
      reason: "No active company values are set up yet. Ask a Spotcoin admin to add values in Admin → Settings.",
    };
  }

  try {
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

class SlackSubmitRecognitionError extends Error {
  constructor(
    message: string,
    readonly field: "message_block" | "recipient_block",
  ) {
    super(message);
    this.name = "SlackSubmitRecognitionError";
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

  let token: string;
  try {
    token = await getTokenForTeam(teamId);
  } catch {
    throw new SlackSubmitRecognitionError(
      "Slack bot is not installed for this workspace.",
      "message_block",
    );
  }

  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(token);

  let sender = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, slackUserId: senderSlackId, deletedAt: null },
    select: { id: true, name: true, username: true, email: true },
  });
  if (!sender) {
    const link = await tryLinkSlackUserFromProfile(workspace.id, senderSlackId, client);
    if (!link.ok) {
      throw new SlackSubmitRecognitionError(reasonForLinkFailure(link.code), "message_block");
    }
    sender = await prisma.user.findFirst({
      where: { workspaceId: workspace.id, slackUserId: senderSlackId, deletedAt: null },
      select: { id: true, name: true, username: true, email: true },
    });
  }
  if (!sender) {
    throw new SlackSubmitRecognitionError(
      "Your Slack account is not linked to Spotcoin. Use the same email as your invite, then try again.",
      "message_block",
    );
  }

  const recipientSlackId = payload.view?.state?.values?.recipient_block?.recipient?.selected_user;
  const message = payload.view?.state?.values?.message_block?.message?.value;
  const valueId = payload.view?.state?.values?.value_block?.value?.selected_option?.value;
  const coinAmountRaw = payload.view?.state?.values?.coin_block?.coin_amount?.selected_option?.value;
  if (!recipientSlackId || !message || !valueId || !coinAmountRaw) return;

  let recipient = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, slackUserId: recipientSlackId, deletedAt: null },
    select: { id: true, name: true, username: true, email: true, slackUserId: true },
  });
  if (!recipient) {
    const link = await tryLinkSlackUserFromProfile(workspace.id, recipientSlackId, client);
    if (!link.ok) {
      throw new SlackSubmitRecognitionError(
        "That teammate is not on Spotcoin yet, or their Slack email does not match their invite. Ask them to join or fix their Slack email.",
        "recipient_block",
      );
    }
    recipient = await prisma.user.findFirst({
      where: { workspaceId: workspace.id, slackUserId: recipientSlackId, deletedAt: null },
      select: { id: true, name: true, username: true, email: true, slackUserId: true },
    });
  }
  if (!recipient) {
    throw new SlackSubmitRecognitionError(
      "Could not resolve the selected teammate in Spotcoin.",
      "recipient_block",
    );
  }

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
      if (err instanceof SlackSubmitRecognitionError) {
        return new Response(
          JSON.stringify({
            response_action: "errors",
            errors: { [err.field]: err.message },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
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
