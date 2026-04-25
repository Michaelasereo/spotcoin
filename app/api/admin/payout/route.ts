import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { payoutService } from "@/lib/services/payoutService";

export const GET = requireAdmin(async (_request, _context, session) => {
  try {
    const ledger = await payoutService.getPayoutLedger(session.user.workspaceId);
    return success(ledger);
  } catch (err) {
    return error(err);
  }
});
