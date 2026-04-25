import { z } from "zod";
import { AppError } from "@/lib/errors";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

const roleSchema = z.object({
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
});

export const PATCH = requireAdmin(async (request, context, session) => {
  try {
    const userId = context.params?.id;
    if (!userId) {
      throw new AppError("Missing user id", "INVALID_REQUEST", 400);
    }

    const payload = roleSchema.parse(await request.json());
    const result = await userService.updateRole(
      session.user.id,
      userId,
      session.user.workspaceId,
      payload.role,
    );

    return success(result);
  } catch (err) {
    return error(err);
  }
});
