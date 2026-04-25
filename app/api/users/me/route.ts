import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

export const GET = requireAuth(async (_request, _context, session) => {
  try {
    const data = await userService.getMe(session.user.id);
    return success(data);
  } catch (err) {
    return error(err);
  }
});
