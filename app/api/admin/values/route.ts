import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { workspaceService } from "@/lib/services/workspaceService";

const createValueSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const POST = requireAdmin(async (request, _context, session) => {
  try {
    const payload = createValueSchema.parse(await request.json());
    const value = await workspaceService.createValue(
      session.user.id,
      session.user.workspaceId,
      payload,
    );
    return success(value);
  } catch (err) {
    return error(err);
  }
});
