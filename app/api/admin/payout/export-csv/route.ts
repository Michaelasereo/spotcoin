import { error } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { payoutService } from "@/lib/services/payoutService";

export const GET = requireAdmin(async (_request, _context, session) => {
  try {
    const csv = await payoutService.generatePayoutCSV(session.user.workspaceId);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="spotcoin-payout.csv"',
      },
    });
  } catch (err) {
    return error(err);
  }
});
