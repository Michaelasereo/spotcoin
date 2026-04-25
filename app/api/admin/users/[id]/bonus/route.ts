import { z } from "zod";
import { AppError } from "@/lib/errors";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

const bonusSchema = z.object({
  amount: z.number().int().min(1),
  reason: z.string().optional(),
});

export const PATCH = requireAdmin(async (request, context, session) => {
  try {
    const payload = bonusSchema.parse(await request.json());
    const userId = context.params?.id;
    if (!userId) {
      throw new AppError("Missing user id", "INVALID_REQUEST", 400);
    }

    const updated = await userService.grantBonusCoins(
      session.user.id,
      userId,
      session.user.workspaceId,
      payload.amount,
      payload.reason,
    );

    return success(updated);
  } catch (err) {
    return error(err);
  }
});
