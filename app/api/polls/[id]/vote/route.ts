import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { pollService } from "@/lib/services/pollService";

const voteSchema = z.object({
  optionIds: z.array(z.string().min(1)).min(1),
});

export const POST = requireAuth(async (request, context, session) => {
  try {
    const id = context.params?.id;
    if (!id) {
      throw new AppError("Missing poll id", "INVALID_REQUEST", 400);
    }
    const body = voteSchema.parse(await request.json());
    const poll = await pollService.castVote(id, session.user.workspaceId, session.user.id, body.optionIds);
    return success(poll);
  } catch (err) {
    return error(err);
  }
});
