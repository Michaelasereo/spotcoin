import { z } from "zod";

import { error, success } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { passwordResetService } from "@/lib/services/passwordResetService";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getRequestClientIp } from "@/lib/requestContext";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const ip = getRequestClientIp(request);
    const rate = await consumeRateLimit(`forgot-password:${ip}`, 5, 15 * 60);
    if (!rate.ok) {
      throw new AppError("Too many reset requests. Try again later.", "RATE_LIMIT_EXCEEDED", 429);
    }

    const body = bodySchema.parse(await request.json());
    await passwordResetService.requestReset(body.email);
    return success({ ok: true as const });
  } catch (err) {
    return error(err);
  }
}
