import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { sendDisengagedNudgeDM } from "@/lib/slack/notifier";

const bodySchema = z.object({
  userId: z.string().min(1),
});

export const POST = requireAdmin(async (request, _context, session) => {
  try {
    const payload = bodySchema.parse(await request.json());

    const [user, workspace] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: payload.userId,
          workspaceId: session.user.workspaceId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          slackUserId: true,
        },
      }),
      prisma.workspace.findUnique({
        where: { id: session.user.workspaceId },
        select: { slackTeamId: true, targetChannelId: true },
      }),
    ]);

    if (!user || !workspace) {
      throw new AppError("User or workspace not found", "NOT_FOUND", 404);
    }

    await sendDisengagedNudgeDM(
      { name: user.name, slackUserId: user.slackUserId },
      { slackTeamId: workspace.slackTeamId, targetChannelId: workspace.targetChannelId },
    );

    return success({ ok: true });
  } catch (err) {
    return error(err);
  }
});
