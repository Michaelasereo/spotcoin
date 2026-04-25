import { AppError } from "@/lib/errors";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { payoutService } from "@/lib/services/payoutService";

export const PATCH = requireAdmin(async (_request, context, session) => {
  try {
    const userId = context.params?.userId;
    if (!userId) {
      throw new AppError("Missing user id", "INVALID_REQUEST", 400);
    }
    await payoutService.markPayoutComplete(session.user.id, userId, session.user.workspaceId);
    return success({ ok: true });
  } catch (err) {
    return error(err);
  }
});
