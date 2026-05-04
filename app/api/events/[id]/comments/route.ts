import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { eventService } from "@/lib/services/eventService";

const commentSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const GET = requireAuth(async (_request, context, session) => {
  try {
    const id = context.params?.id;
    if (!id) throw new AppError("Missing event id", "INVALID_REQUEST", 400);
    const comments = await eventService.listComments(id, session.user.workspaceId);
    return success(comments);
  } catch (err) {
    return error(err);
  }
});

export const POST = requireAuth(async (request, context, session) => {
  try {
    const id = context.params?.id;
    if (!id) throw new AppError("Missing event id", "INVALID_REQUEST", 400);
    const body = commentSchema.parse(await request.json());
    const comment = await eventService.addComment(id, session.user.workspaceId, session.user.id, body.message);
    return success(comment);
  } catch (err) {
    return error(err);
  }
});
