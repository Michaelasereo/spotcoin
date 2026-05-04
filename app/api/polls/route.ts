import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdminOrManager, requireAuth } from "@/lib/auth";
import { pollService } from "@/lib/services/pollService";

const statusSchema = z.enum(["open", "ended", "all"]).default("all");

const optionSchema = z.object({
  label: z.string(),
  optionUserId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0),
});

const createPollSchema = z.object({
  kind: z.enum(["POLL", "AWARD"]),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  multiSelect: z.boolean(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  resultVisibility: z.enum(["AUTO_AFTER_END", "MANUAL"]),
  options: z.array(optionSchema).min(2).max(10),
});

export const GET = requireAuth(async (request, _context, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = statusSchema.parse(searchParams.get("status") ?? "all");
    const polls = await pollService.list(session.user.workspaceId, status, session.user.id);
    return success(polls);
  } catch (err) {
    return error(err);
  }
});

export const POST = requireAdminOrManager(async (request, _context, session) => {
  try {
    const body = createPollSchema.parse(await request.json());
    const poll = await pollService.create(session.user.id, session.user.workspaceId, {
      kind: body.kind,
      title: body.title,
      description: body.description,
      multiSelect: body.multiSelect,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      resultVisibility: body.resultVisibility,
      options: body.options,
    });
    return success(poll);
  } catch (err) {
    return error(err);
  }
});
