import { prisma } from "@/lib/db";

export type AnalyticsPeriod = "this_month" | "last_month" | "ytd";

function getPeriodRange(period: AnalyticsPeriod) {
  const now = new Date();
  if (period === "ytd") {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: now,
    };
  }

  if (period === "last_month") {
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      from: firstDayLastMonth,
      to: new Date(firstDayCurrentMonth.getTime() - 1),
    };
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  };
}

export const analyticsService = {
  async getAnalytics(workspaceId: string, period: AnalyticsPeriod) {
    const { from, to } = getPeriodRange(period);

    const recognitions = await prisma.recognition.findMany({
      where: {
        workspaceId,
        createdAt: { gte: from, lte: to },
      },
      select: {
        senderId: true,
        recipientId: true,
        coinAmount: true,
        valueId: true,
      },
    });

    const users = await prisma.user.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true, email: true, slackUserId: true, lastActiveAt: true },
    });

    const valueDefs = await prisma.companyValue.findMany({
      where: { workspaceId },
      select: { id: true, name: true, emoji: true },
      orderBy: { name: "asc" },
    });

    const senderCounts = new Map<string, number>();
    const receiverCounts = new Map<string, number>();
    const valueCounts = new Map<string, number>();

    let totalCoinsGiven = 0;
    for (const recognition of recognitions) {
      senderCounts.set(recognition.senderId, (senderCounts.get(recognition.senderId) ?? 0) + 1);
      receiverCounts.set(
        recognition.recipientId,
        (receiverCounts.get(recognition.recipientId) ?? 0) + 1,
      );
      valueCounts.set(recognition.valueId, (valueCounts.get(recognition.valueId) ?? 0) + 1);
      totalCoinsGiven += recognition.coinAmount;
    }

    const activeUsers = new Set([
      ...Array.from(senderCounts.keys()),
      ...Array.from(receiverCounts.keys()),
    ]).size;

    const userMap = new Map(users.map((user) => [user.id, user]));

    const topSenders = Array.from(senderCounts.entries())
      .map(([userId, count]) => ({
        userId,
        name: userMap.get(userId)?.name ?? "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topReceivers = Array.from(receiverCounts.entries())
      .map(([userId, count]) => ({
        userId,
        name: userMap.get(userId)?.name ?? "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const valueBreakdown = valueDefs.map((value) => ({
      valueId: value.id,
      name: value.name,
      emoji: value.emoji,
      count: valueCounts.get(value.id) ?? 0,
    }));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const disengaged = users
      .filter((user) => {
        const sent = senderCounts.get(user.id) ?? 0;
        const received = receiverCounts.get(user.id) ?? 0;
        const noRecognition = sent === 0 && received === 0;
        const staleActivity = !user.lastActiveAt || user.lastActiveAt < thirtyDaysAgo;
        return noRecognition && staleActivity;
      })
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        slackUserId: user.slackUserId,
        lastActiveAt: user.lastActiveAt,
      }));

    return {
      summary: {
        totalRecognitions: recognitions.length,
        totalCoinsGiven,
        activeUsers,
        avgPerUser: activeUsers > 0 ? Number((recognitions.length / activeUsers).toFixed(2)) : 0,
      },
      leaderboard: {
        topSenders,
        topReceivers,
      },
      valueCounts: valueBreakdown,
      disengaged,
    };
  },
};
