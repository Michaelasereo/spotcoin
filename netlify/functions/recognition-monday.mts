import type { Config } from "@netlify/functions";
import { WebClient } from "@slack/web-api";
import { prisma } from "../../lib/db";
import { decrypt } from "../../lib/encryption";

const logger = {
  info: (message: string, data?: unknown) =>
    console.info(`[recognition-monday] ${message}`, data ?? ""),
  error: (message: string, data?: unknown) =>
    console.error(`[recognition-monday] ${message}`, data ?? ""),
};

function isLastMondayOfMonth(date: Date): boolean {
  const candidate = new Date(date);
  candidate.setDate(candidate.getDate() + 7);
  return candidate.getMonth() !== date.getMonth();
}

export default async () => {
  try {
    logger.info("Job started");

    const workspaces = await prisma.workspace.findMany({
      where: { slackTeamId: { not: null } },
      select: {
        id: true,
        recognitionSchedule: true,
        targetChannelId: true,
        slackTeamId: true,
      },
    });

    const today = new Date();

    for (const workspace of workspaces) {
      try {
        if (!workspace.targetChannelId || !workspace.slackTeamId) {
          logger.info("Skipping workspace without Slack channel/team", { workspaceId: workspace.id });
          continue;
        }

        const shouldPost =
          workspace.recognitionSchedule === "EVERY_MONDAY" ||
          (workspace.recognitionSchedule === "LAST_MONDAY" && isLastMondayOfMonth(today));

        if (!shouldPost) {
          logger.info("Skipping workspace due to schedule", {
            workspaceId: workspace.id,
            schedule: workspace.recognitionSchedule,
          });
          continue;
        }

        const installation = await prisma.slackInstallation.findFirst({
          where: {
            workspaceId: workspace.id,
            slackTeamId: workspace.slackTeamId,
          },
          select: { botToken: true },
        });

        if (!installation?.botToken) {
          logger.info("No Slack installation token found", { workspaceId: workspace.id });
          continue;
        }

        const users = await prisma.user.findMany({
          where: {
            workspaceId: workspace.id,
            deletedAt: null,
          },
          select: { coinsToGive: true },
        });

        const aggregateCoins = users.reduce((sum, user) => sum + user.coinsToGive, 0);
        const text = `Recognition Monday is live. There are ${aggregateCoins} coins available across the team this week.`;

        const client = new WebClient(decrypt(installation.botToken));
        await client.chat.postMessage({
          channel: workspace.targetChannelId,
          text,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Recognition Monday* :coin:\n${text}`,
              },
            },
          ],
        });

        logger.info("Recognition Monday posted", {
          workspaceId: workspace.id,
          channel: workspace.targetChannelId,
          timestamp: new Date().toISOString(),
        });
      } catch (workspaceError) {
        logger.error("Failed to post for workspace", {
          workspaceId: workspace.id,
          error: workspaceError instanceof Error ? workspaceError.message : "Unknown error",
        });
      }
    }

    logger.info("Job completed");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    logger.error("Job failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config: Config = {
  schedule: "0 8 * * 1",
};
