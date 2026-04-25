import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { analyticsService } from "@/lib/services/analyticsService";

const querySchema = z.object({
  period: z.enum(["this_month", "last_month", "ytd"]).default("this_month"),
});

export const GET = requireAdmin(async (request, _context, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      period: searchParams.get("period") ?? "this_month",
    });

    const data = await analyticsService.getAnalytics(session.user.workspaceId, query.period);
    return success(data);
  } catch (err) {
    return error(err);
  }
});
