import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

const patchMeSchema = z.object({
  username: z.string().nullable(),
});

export const GET = requireAuth(async (_request, _context, session) => {
  try {
    const data = await userService.getMe(session.user.id);
    return success(data);
  } catch (err) {
    return error(err);
  }
});

export const PATCH = requireAuth(async (request, _context, session) => {
  try {
    const body = patchMeSchema.parse(await request.json());
    const data = await userService.updateOwnUsername(session.user.id, body.username);
    return success(data);
  } catch (err) {
    return error(err);
  }
});
