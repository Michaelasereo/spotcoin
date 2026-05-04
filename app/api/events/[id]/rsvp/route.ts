import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { eventService } from "@/lib/services/eventService";

const rsvpSchema = z.object({
  status: z.enum(["GOING", "INTERESTED", "NOT_GOING"]),
});

export const PUT = requireAuth(async (request, context, session) => {
  try {
    const id = context.params?.id;
    if (!id) throw new AppError("Missing event id", "INVALID_REQUEST", 400);
    const body = rsvpSchema.parse(await request.json());
    await eventService.setRsvp(id, session.user.workspaceId, session.user.id, body.status);
    const event = await eventService.get(id, session.user.workspaceId, session.user.id);
    return success(event);
  } catch (err) {
    return error(err);
  }
});
