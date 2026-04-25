import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { payoutService } from "@/lib/services/payoutService";

export const POST = requireAdmin(async (_request, _context, session) => {
  try {
    const data = await payoutService.openPayoutWindow(session.user.id, session.user.workspaceId);
    return success(data);
  } catch (err) {
    return error(err);
  }
});
