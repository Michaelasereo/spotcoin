import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { workspaceService } from "@/lib/services/workspaceService";

export const GET = requireAuth(async (_request, _context, session) => {
  try {
    const values = await workspaceService.getValues(session.user.workspaceId);
    return success(values);
  } catch (err) {
    return error(err);
  }
});
