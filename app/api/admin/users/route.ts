import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

export const GET = requireAdmin(async (_request, _context, session) => {
  try {
    const users = await userService.listWorkspaceUsers(session.user.id, session.user.workspaceId);
    return success(users);
  } catch (err) {
    return error(err);
  }
});
