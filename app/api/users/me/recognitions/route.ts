import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

const querySchema = z.object({
  direction: z.enum(["sent", "received", "both"]).optional(),
  valueId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = requireAuth(async (request, _context, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      direction: searchParams.get("direction") ?? undefined,
      valueId: searchParams.get("valueId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 20,
    });

    const data = await userService.getUserRecognitions(session.user.id, session.user.workspaceId, {
      direction: query.direction,
      valueId: query.valueId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    return success(data.items, data.meta);
  } catch (err) {
    return error(err);
  }
});
