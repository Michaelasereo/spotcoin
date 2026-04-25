import { z } from "zod";
import { error, success } from "@/lib/api";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rateLimit";
import { recognitionService } from "@/lib/services/recognitionService";

const sendRecognitionSchema = z.object({
  recipientId: z.string().min(1),
  message: z.string().min(10),
  valueId: z.string().min(1),
  coinAmount: z.number().int().min(1),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.workspaceId) {
      throw new AppError("Authentication required", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 20,
    });

    const feed = await recognitionService.getFeed(
      session.user.workspaceId,
      query.page,
      query.pageSize,
    );

    return success(feed.items, feed.meta);
  } catch (err) {
    return error(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("Authentication required", "UNAUTHORIZED", 401);
    }

    const rateLimit = await consumeRateLimit(
      `recognitions:${session.user.id}`,
      10,
      60 * 60,
    );
    if (!rateLimit.ok) {
      throw new AppError("Rate limit exceeded for recognitions", "RATE_LIMIT_EXCEEDED", 429);
    }

    const payload = sendRecognitionSchema.parse(await request.json());
    const recognition = await recognitionService.send(session.user.id, payload);
    return success(recognition);
  } catch (err) {
    return error(err);
  }
}
