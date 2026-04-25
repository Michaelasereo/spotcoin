import { WebClient } from "@slack/web-api";
import { encrypt } from "@/lib/encryption";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { verifySlackOAuthState } from "@/lib/slack/oauthState";

function redirectWithStatus(status: string) {
  return Response.redirect(`${env.NEXT_PUBLIC_APP_URL}/admin/settings?slack=${status}`, 302);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      return redirectWithStatus("oauth_denied");
    }

    if (!code) {
      return redirectWithStatus("missing_code");
    }

    const statePayload = verifySlackOAuthState(state);
    if (!statePayload) {
      return redirectWithStatus("invalid_state");
    }

    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      return redirectWithStatus("not_configured");
    }

    const client = new WebClient();
    const oauthResponse = await client.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
    });

    const teamId = oauthResponse.team?.id;
    const botToken = oauthResponse.access_token;
    const botUserId = oauthResponse.bot_user_id;
    const authedUserId = oauthResponse.authed_user?.id;
    if (!teamId || !botToken || !botUserId || !authedUserId) {
      return redirectWithStatus("invalid_response");
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: statePayload.workspaceId,
        users: {
          some: {
            id: statePayload.userId,
            role: "ADMIN",
            deletedAt: null,
          },
        },
      },
      select: { id: true },
    });
    if (!workspace) {
      return redirectWithStatus("workspace_not_found");
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        slackTeamId: teamId,
        name: oauthResponse.team?.name ?? undefined,
      },
    });

    await prisma.slackInstallation.upsert({
      where: { slackTeamId: teamId },
      update: {
        workspaceId: statePayload.workspaceId,
        botToken: encrypt(botToken),
        botUserId,
        installedById: authedUserId,
      },
      create: {
        workspaceId: statePayload.workspaceId,
        slackTeamId: teamId,
        botToken: encrypt(botToken),
        botUserId,
        installedById: authedUserId,
      },
    });

    return redirectWithStatus("connected");
  } catch {
    return redirectWithStatus("oauth_failed");
  }
}
