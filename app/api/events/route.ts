import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdminOrManager, requireAuth } from "@/lib/auth";
import { eventService } from "@/lib/services/eventService";

const whenSchema = z.enum(["upcoming", "past"]).default("upcoming");

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  venue: z.string().max(500).optional().nullable(),
  coverImageUrl: z.string().max(2000).optional().nullable(),
  linkUrl: z.string().max(2000).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
});

export const GET = requireAuth(async (request, _context, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const when = whenSchema.parse(searchParams.get("when") ?? "upcoming");
    const events = await eventService.list(session.user.workspaceId, when);
    return success(events);
  } catch (err) {
    return error(err);
  }
});

export const POST = requireAdminOrManager(async (request, _context, session) => {
  try {
    const body = createEventSchema.parse(await request.json());
    const event = await eventService.create(session.user.id, session.user.workspaceId, {
      title: body.title,
      description: body.description,
      location: body.location,
      venue: body.venue,
      coverImageUrl: body.coverImageUrl || null,
      linkUrl: body.linkUrl || null,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    });
    return success(event);
  } catch (err) {
    return error(err);
  }
});
