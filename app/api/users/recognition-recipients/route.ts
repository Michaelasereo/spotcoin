import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

export const GET = requireAuth(async (_request, _context, session) => {
  try {
    const users = await userService.listRecognitionRecipients(
      session.user.workspaceId,
      session.user.id,
    );
    return success(users);
  } catch (err) {
    return error(err);
  }
});
