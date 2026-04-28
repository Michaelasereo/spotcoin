import { z } from "zod";
import { AppError } from "@/lib/errors";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { positionService } from "@/lib/services/positionService";

const updatePositionSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const PATCH = requireAdmin(async (request, context, session) => {
  try {
    const positionId = context.params?.id;
    if (!positionId) {
      throw new AppError("Missing position id", "INVALID_REQUEST", 400);
    }

    const payload = updatePositionSchema.parse(await request.json());
    const position = await positionService.update(
      session.user.id,
      positionId,
      session.user.workspaceId,
      payload,
    );

    return success(position);
  } catch (err) {
    return error(err);
  }
});
