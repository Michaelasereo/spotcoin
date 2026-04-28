import { z } from "zod";
import { AppError } from "@/lib/errors";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { positionService } from "@/lib/services/positionService";

const assignSchema = z.object({
  positionId: z.string().min(1).nullable(),
});

export const PATCH = requireAdmin(async (request, context, session) => {
  try {
    const userId = context.params?.id;
    if (!userId) {
      throw new AppError("Missing user id", "INVALID_REQUEST", 400);
    }

    const payload = assignSchema.parse(await request.json());
    const result = await positionService.assignToUser(
      session.user.id,
      userId,
      session.user.workspaceId,
      payload.positionId,
    );

    return success(result);
  } catch (err) {
    return error(err);
  }
});
