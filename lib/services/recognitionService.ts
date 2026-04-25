import type { Prisma, Recognition } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { sendLowBalanceDM } from "@/lib/slack/notifier";

export type SendRecognitionInput = {
  recipientId: string;
  message: string;
  valueId: string;
  coinAmount: number;
};

export type RecognitionHistoryFilters = {
  direction?: "sent" | "received" | "both";
  valueId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export const recognitionService = {
  async send(senderId: string, input: SendRecognitionInput): Promise<Recognition> {
    if (senderId === input.recipientId) {
      throw new AppError("You cannot recognize yourself", "SELF_RECOGNITION", 400);
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, workspaceId: true, coinsToGive: true, deletedAt: true },
    });

    if (!sender || sender.deletedAt) {
      throw new AppError("Sender account is unavailable", "SENDER_NOT_FOUND", 404);
    }

    const recipient = await prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { id: true, workspaceId: true, deletedAt: true },
    });

    if (!recipient || recipient.deletedAt) {
      throw new AppError("Recipient not found", "RECIPIENT_NOT_FOUND", 404);
    }

    if (sender.workspaceId !== recipient.workspaceId) {
      throw new AppError("Recipient must be in your workspace", "WORKSPACE_MISMATCH", 403);
    }

    if (sender.coinsToGive < input.coinAmount) {
      throw new AppError("Insufficient coins to give", "INSUFFICIENT_BALANCE", 400);
    }

    const value = await prisma.companyValue.findFirst({
      where: {
        id: input.valueId,
        workspaceId: sender.workspaceId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!value) {
      throw new AppError("Selected company value is invalid", "VALUE_NOT_FOUND", 404);
    }

    const sanitizedMessage = sanitizeHtml(input.message, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();

    if (sanitizedMessage.length < 10) {
      throw new AppError("Recognition message must be at least 10 characters", "INVALID_MESSAGE", 400);
    }

    const { recognition, senderAfterUpdate } = await prisma.$transaction(async (tx) => {
      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: {
          coinsToGive: { decrement: input.coinAmount },
          lastActiveAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          slackUserId: true,
          coinsToGive: true,
        },
      });

      await tx.user.update({
        where: { id: input.recipientId },
        data: {
          spotTokensEarned: { increment: input.coinAmount },
        },
      });

      const createdRecognition = await tx.recognition.create({
        data: {
          senderId,
          recipientId: input.recipientId,
          workspaceId: sender.workspaceId,
          valueId: input.valueId,
          message: sanitizedMessage,
          coinAmount: input.coinAmount,
        },
      });

      await tx.coinTransaction.createMany({
        data: [
          {
            userId: senderId,
            workspaceId: sender.workspaceId,
            type: "RECOGNITION_SENT",
            amount: -input.coinAmount,
            referenceId: createdRecognition.id,
          },
          {
            userId: input.recipientId,
            workspaceId: sender.workspaceId,
            type: "RECOGNITION_RECEIVED",
            amount: input.coinAmount,
            referenceId: createdRecognition.id,
          },
        ],
      });

      return { recognition: createdRecognition, senderAfterUpdate: updatedSender };
    });

    const workspace = await prisma.workspace.findUnique({
      where: { id: sender.workspaceId },
      select: { slackTeamId: true, targetChannelId: true },
    });

    void sendLowBalanceDM(
      {
        name: senderAfterUpdate.name,
        slackUserId: senderAfterUpdate.slackUserId,
        coinsToGive: senderAfterUpdate.coinsToGive,
      },
      {
        slackTeamId: workspace?.slackTeamId ?? null,
        targetChannelId: workspace?.targetChannelId ?? null,
      },
    );

    return recognition;
  },

  async getFeed(workspaceId: string, page: number, pageSize: number) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const skip = (safePage - 1) * safePageSize;

    const [items, total] = await Promise.all([
      prisma.recognition.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        skip,
        take: safePageSize,
        include: {
          sender: { select: { name: true, avatarUrl: true } },
          recipient: { select: { name: true, avatarUrl: true } },
          value: { select: { name: true, emoji: true } },
        },
      }),
      prisma.recognition.count({ where: { workspaceId } }),
    ]);

    return {
      items,
      meta: {
        page: safePage,
        pageSize: safePageSize,
        total,
      },
    };
  },

  async getUserHistory(userId: string, workspaceId: string, filters: RecognitionHistoryFilters = {}) {
    const direction = filters.direction ?? "both";
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const dateRange: Prisma.DateTimeFilter = {};
    if (filters.from) {
      dateRange.gte = filters.from;
    }
    if (filters.to) {
      dateRange.lte = filters.to;
    }

    const where: Prisma.RecognitionWhereInput = {
      workspaceId,
      ...(filters.valueId ? { valueId: filters.valueId } : {}),
      ...(filters.from || filters.to ? { createdAt: dateRange } : {}),
    };

    if (direction === "sent") {
      where.senderId = userId;
    } else if (direction === "received") {
      where.recipientId = userId;
    } else {
      where.OR = [{ senderId: userId }, { recipientId: userId }];
    }

    const [items, total] = await Promise.all([
      prisma.recognition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          sender: { select: { name: true, avatarUrl: true } },
          recipient: { select: { name: true, avatarUrl: true } },
          value: { select: { name: true, emoji: true } },
        },
      }),
      prisma.recognition.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
      },
    };
  },
};
