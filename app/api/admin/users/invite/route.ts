import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rateLimit";
import { userService } from "@/lib/services/userService";

const inviteSchema = z.object({
  email: z.string().email(),
});

export const POST = requireAdmin(async (request, _context, session) => {
  try {
    const rateLimit = await consumeRateLimit(
      `invite:${session.user.id}`,
      50,
      24 * 60 * 60,
    );
    if (!rateLimit.ok) {
      throw new AppError("Rate limit exceeded for invites", "RATE_LIMIT_EXCEEDED", 429);
    }

    const payload = inviteSchema.parse(await request.json());
    const user = await userService.invite(
      session.user.id,
      payload.email,
      session.user.workspaceId,
    );
    return success(user);
  } catch (err) {
    return error(err);
  }
});
