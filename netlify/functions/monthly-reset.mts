import type { Config } from "@netlify/functions";
import { prisma } from "../../lib/db";

const logger = {
  info: (message: string, data?: unknown) => console.info(`[monthly-reset] ${message}`, data ?? ""),
  error: (message: string, data?: unknown) =>
    console.error(`[monthly-reset] ${message}`, data ?? ""),
};

export default async () => {
  try {
    logger.info("Job started");

    const workspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        monthlyAllowance: true,
      },
    });

    let totalResetUsers = 0;

    for (const workspace of workspaces) {
      try {
        const users = await prisma.user.findMany({
          where: {
            workspaceId: workspace.id,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (users.length === 0) {
          logger.info("No active users found for workspace", { workspaceId: workspace.id });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          for (const user of users) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                coinsToGive: workspace.monthlyAllowance,
              },
            });

            await tx.coinTransaction.create({
              data: {
                userId: user.id,
                workspaceId: workspace.id,
                type: "ALLOWANCE_GRANT",
                amount: workspace.monthlyAllowance,
              },
            });
          }
        });

        totalResetUsers += users.length;
        logger.info("Workspace reset complete", {
          workspaceId: workspace.id,
          usersReset: users.length,
        });
      } catch (workspaceError) {
        logger.error("Workspace reset failed", {
          workspaceId: workspace.id,
          error: workspaceError instanceof Error ? workspaceError.message : "Unknown error",
        });
      }
    }

    logger.info("Job completed", { totalResetUsers });
    return new Response(
      JSON.stringify({ ok: true, totalResetUsers }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    logger.error("Job failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
};

export const config: Config = {
  schedule: "1 0 1 * *",
};
