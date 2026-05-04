import { z } from "zod";

import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { userService } from "@/lib/services/userService";

const bodySchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });

export const PATCH = requireAuth(async (request, _context, session) => {
  try {
    const body = bodySchema.parse(await request.json());
    await userService.changeOwnPassword(session.user.id, body.currentPassword, body.newPassword);
    return success({ ok: true as const });
  } catch (err) {
    return error(err);
  }
});
