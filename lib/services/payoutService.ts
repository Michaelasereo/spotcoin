import { Resend } from "resend";
import { resendFromAddress } from "@/lib/resendFrom";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

async function assertAdminAccess(adminId: string, workspaceId: string) {
  const admin = await prisma.user.findFirst({
    where: {
      id: adminId,
      workspaceId,
      role: "ADMIN",
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!admin) {
    throw new AppError("Admin user not found in workspace", "ADMIN_NOT_FOUND", 403);
  }
}

export const payoutService = {
  async openPayoutWindow(adminId: string, workspaceId: string) {
    await assertAdminAccess(adminId, workspaceId);

    await prisma.payoutWindow.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        openedById: adminId,
        status: "OPEN",
      },
      update: {
        status: "OPEN",
        openedById: adminId,
        openedAt: new Date(),
      },
    });

    return this.getPayoutLedger(workspaceId);
  },

  async getPayoutLedger(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        tokenValueNaira: true,
        payoutWindows: {
          where: { status: "OPEN" },
          orderBy: { openedAt: "desc" },
          take: 1,
          select: { id: true, openedAt: true, status: true },
        },
      },
    });

    if (!workspace) {
      throw new AppError("Workspace not found", "WORKSPACE_NOT_FOUND", 404);
    }

    const users = await prisma.user.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        payoutStatus: "PENDING",
        spotTokensEarned: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        email: true,
        spotTokensEarned: true,
        payoutStatus: true,
      },
      orderBy: { spotTokensEarned: "desc" },
    });

    const entries = users.map((user) => ({
      ...user,
      nairaValue: user.spotTokensEarned * workspace.tokenValueNaira,
    }));

    const totalSpotTokens = entries.reduce((sum, user) => sum + user.spotTokensEarned, 0);
    const totalNaira = entries.reduce((sum, user) => sum + user.nairaValue, 0);

    return {
      payoutWindow: workspace.payoutWindows[0] ?? null,
      tokenValueNaira: workspace.tokenValueNaira,
      entries,
      summary: {
        totalEmployees: entries.length,
        totalSpotTokens,
        totalNaira,
      },
    };
  },

  async markPayoutComplete(adminId: string, targetUserId: string, workspaceId: string) {
    await assertAdminAccess(adminId, workspaceId);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { tokenValueNaira: true },
    });
    if (!workspace) {
      throw new AppError("Workspace not found", "WORKSPACE_NOT_FOUND", 404);
    }

    const user = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        spotTokensEarned: true,
      },
    });

    if (!user) {
      throw new AppError("Target user not found", "USER_NOT_FOUND", 404);
    }

    if (user.spotTokensEarned <= 0) {
      throw new AppError("User has no tokens to pay out", "NO_TOKENS", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          workspaceId,
          type: "PAYOUT",
          amount: -user.spotTokensEarned,
          referenceId: `PAYOUT:${new Date().toISOString()}`,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          spotTokensEarned: 0,
          payoutStatus: "COMPLETED",
        },
      });
    });

    if (resendClient) {
      await resendClient.emails.send({
        from: resendFromAddress(),
        to: user.email,
        subject: "Your Spotcoin payout is complete",
        text: `Hi ${user.name}, your payout of ₦${(
          user.spotTokensEarned * workspace.tokenValueNaira
        ).toLocaleString("en-NG")} has been processed.`,
      });
    }
  },

  async generatePayoutCSV(workspaceId: string) {
    const ledger = await this.getPayoutLedger(workspaceId);
    const header = "Name,Email,Spot-tokens,Naira Value";
    const rows = ledger.entries.map((entry) =>
      [entry.name, entry.email, entry.spotTokensEarned, entry.nairaValue]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    return [header, ...rows].join("\n");
  },
};
