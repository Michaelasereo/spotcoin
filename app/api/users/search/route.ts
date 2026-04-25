import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

const querySchema = z.object({
  q: z.string().min(1),
});

export const GET = requireAuth(async (request, _context, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({ q: searchParams.get("q") ?? "" });
    const users = await userService.searchUsers(session.user.workspaceId, query.q);
    return success(users);
  } catch (err) {
    return error(err);
  }
});
