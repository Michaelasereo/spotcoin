import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { Resend } from "resend";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resendFromAddress } from "@/lib/resendFrom";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { recognitionService, type RecognitionHistoryFilters } from "@/lib/services/recognitionService";

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

export const userService = {
  async listWorkspaceUsers(adminId: string, workspaceId: string) {
    await assertAdminAccess(adminId, workspaceId);

    return prisma.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        coinsToGive: true,
        spotTokensEarned: true,
        lastActiveAt: true,
        deletedAt: true,
        position: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        workspaceId: true,
        coinsToGive: true,
        spotTokensEarned: true,
        payoutStatus: true,
        workspace: {
          select: { name: true, tokenValueNaira: true },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", "USER_NOT_FOUND", 404);
    }

    return user;
  },

  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
    const newTrimmed = newPassword.trim();
    if (newTrimmed.length < 8) {
      throw new AppError("Password must be at least 8 characters", "VALIDATION_ERROR", 400);
    }
    if (newTrimmed === currentPassword) {
      throw new AppError("New password must differ from current password", "VALIDATION_ERROR", 400);
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new AppError("User not found", "USER_NOT_FOUND", 404);
    }

    const ok = await compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppError("Current password is incorrect", "INVALID_CURRENT_PASSWORD", 400);
    }

    const passwordHash = await hash(newTrimmed, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
    });
  },

  async searchUsers(workspaceId: string, query: string) {
    return prisma.user.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        email: true,
      },
      orderBy: { name: "asc" },
      take: 20,
    });
  },

  async getUserRecognitions(userId: string, workspaceId: string, filters: RecognitionHistoryFilters) {
    return recognitionService.getUserHistory(userId, workspaceId, filters);
  },

  async invite(adminId: string, email: string, workspaceId: string) {
    await assertAdminAccess(adminId, workspaceId);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError("A user with this email already exists", "EMAIL_IN_USE", 409);
    }

    const temporaryPassword = randomBytes(8).toString("hex");
    const passwordHash = await hash(temporaryPassword, 12);

    const createdUser = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0] || "New User",
        passwordHash,
        role: "EMPLOYEE",
        workspaceId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        coinsToGive: true,
      },
    });

    if (resendClient) {
      await resendClient.emails.send({
        from: resendFromAddress(),
        to: email,
        subject: "You're invited to Spotcoin",
        text: `You've been invited to Spotcoin. Temporary password: ${temporaryPassword}`,
      });
    }

    return createdUser;
  },

  async grantBonusCoins(
    adminId: string,
    targetUserId: string,
    workspaceId: string,
    amount: number,
    reason?: string,
  ) {
    await assertAdminAccess(adminId, workspaceId);

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, workspaceId, deletedAt: null },
      select: { id: true },
    });

    if (!targetUser) {
      throw new AppError("Target user not found", "USER_NOT_FOUND", 404);
    }

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: { coinsToGive: { increment: amount } },
        select: {
          id: true,
          name: true,
          coinsToGive: true,
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId: targetUserId,
          workspaceId,
          type: "BONUS_GRANT",
          amount,
          referenceId: reason ? `BONUS:${reason}` : undefined,
        },
      });

      return updatedUser;
    });
  },

  async deactivate(adminId: string, targetUserId: string, workspaceId: string) {
    await assertAdminAccess(adminId, workspaceId);

    return prisma.user.updateMany({
      where: { id: targetUserId, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  async updateRole(adminId: string, targetUserId: string, workspaceId: string, role: Role) {
    await assertAdminAccess(adminId, workspaceId);

    const updated = await prisma.user.updateMany({
      where: { id: targetUserId, workspaceId, deletedAt: null },
      data: { role },
    });

    if (updated.count === 0) {
      throw new AppError("Target user not found", "USER_NOT_FOUND", 404);
    }

    return prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  },
};
