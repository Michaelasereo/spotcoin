import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { notifyRecognitionSentToSlack } from "@/lib/slack/notifyRecognitionSent";

const bodySchema = z.object({
  dryRun: z.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  /** Only recognitions created strictly before this instant (ISO 8601). */
  createdBefore: z.string().datetime().optional(),
  /** Only recognitions created strictly after this instant (ISO 8601). */
  createdAfter: z.string().datetime().optional(),
  /** When set, only these recognition rows are considered (must belong to your workspace and have slackTs null). */
  recognitionIds: z.array(z.string().min(1)).max(100).optional(),
});

export const POST = requireAdmin(async (request, _context, session) => {
  try {
    const workspaceId = session.user.workspaceId;
    const body = bodySchema.parse(await request.json().catch(() => ({})));

    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slackTeamId: true, targetChannelId: true },
    });
    if (!ws?.slackTeamId || !ws.targetChannelId) {
      throw new AppError(
        "Slack is not fully configured (install the app and set a recognition channel).",
        "SLACK_NOT_CONFIGURED",
        400,
      );
    }

    const requestedIds = body.recognitionIds?.length
      ? [...new Set(body.recognitionIds)].slice(0, 100)
      : null;

    let candidates: { id: string; createdAt: Date }[];
    let notQueued: string[] = [];

    if (requestedIds) {
      const found = await prisma.recognition.findMany({
        where: {
          workspaceId,
          slackTs: null,
          id: { in: requestedIds },
        },
        select: { id: true, createdAt: true },
      });
      const foundSet = new Set(found.map((r) => r.id));
      notQueued = requestedIds.filter((id) => !foundSet.has(id));
      candidates = requestedIds
        .map((id) => found.find((r) => r.id === id))
        .filter((r): r is { id: string; createdAt: Date } => r !== undefined);
    } else {
      const createdAt: Prisma.DateTimeFilter = {};
      if (body.createdBefore) {
        createdAt.lt = new Date(body.createdBefore);
      }
      if (body.createdAfter) {
        createdAt.gt = new Date(body.createdAfter);
      }

      candidates = await prisma.recognition.findMany({
        where: {
          workspaceId,
          slackTs: null,
          ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: body.limit,
      });
    }

    if (body.dryRun) {
      return success({
        dryRun: true,
        queued: candidates.length,
        recognitionIds: candidates.map((c) => c.id),
        ...(notQueued.length ? { notQueuedReasonUnknownOrAlreadyPosted: notQueued } : {}),
      });
    }

    let channelPosted = 0;
    let channelFailed = 0;

    for (const row of candidates) {
      const ok = await notifyRecognitionSentToSlack(row.id, workspaceId);
      if (ok) {
        channelPosted += 1;
      } else {
        channelFailed += 1;
      }
      await new Promise((r) => setTimeout(r, 550));
    }

    return success({
      dryRun: false,
      attempted: candidates.length,
      channelPosted,
      channelFailed,
      ...(notQueued.length ? { skippedIds: notQueued } : {}),
      note:
        "Rows with channelFailed still have slackTs null (Slack error, missing channel, or rate limit). Safe to run again. Recognitions that were already posted to Slack before slackTs was tracked may still have slackTs null and can duplicate if backfilled—use createdBefore/createdAfter to narrow the window.",
    });
  } catch (err) {
    return error(err);
  }
});
