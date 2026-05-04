import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdminOrManager, requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { pollService } from "@/lib/services/pollService";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("close") }),
  z.object({
    action: z.literal("toggleResults"),
    value: z.boolean(),
  }),
]);

export const GET = requireAuth(async (_request, context, session) => {
  try {
    const id = context.params?.id;
    if (!id) {
      throw new AppError("Missing poll id", "INVALID_REQUEST", 400);
    }
    const poll = await pollService.getById(session.user.workspaceId, id, session.user.id);
    return success(poll);
  } catch (err) {
    return error(err);
  }
});

export const PATCH = requireAdminOrManager(async (request, context, session) => {
  try {
    const id = context.params?.id;
    if (!id) {
      throw new AppError("Missing poll id", "INVALID_REQUEST", 400);
    }
    const body = patchSchema.parse(await request.json());
    if (body.action === "close") {
      const poll = await pollService.closeNow(id, session.user.workspaceId, session.user.id, session.user.role);
      return success(poll);
    }
    const poll = await pollService.toggleResultsVisible(
      id,
      session.user.workspaceId,
      session.user.id,
      session.user.role,
      body.value,
    );
    return success(poll);
  } catch (err) {
    return error(err);
  }
});

export const DELETE = requireAdminOrManager(async (_request, context, session) => {
  try {
    const id = context.params?.id;
    if (!id) {
      throw new AppError("Missing poll id", "INVALID_REQUEST", 400);
    }
    await pollService.delete(id, session.user.workspaceId, session.user.id, session.user.role);
    return success({ ok: true as const });
  } catch (err) {
    return error(err);
  }
});
