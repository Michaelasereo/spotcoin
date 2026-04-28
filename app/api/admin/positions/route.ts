import { z } from "zod";
import { error, success } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { positionService } from "@/lib/services/positionService";

const createPositionSchema = z.object({
  name: z.string().min(1).max(60),
});

export const GET = requireAdmin(async (_request, _context, session) => {
  try {
    const positions = await positionService.listForWorkspace(session.user.workspaceId);
    return success(positions);
  } catch (err) {
    return error(err);
  }
});

export const POST = requireAdmin(async (request, _context, session) => {
  try {
    const payload = createPositionSchema.parse(await request.json());
    const position = await positionService.create(
      session.user.id,
      session.user.workspaceId,
      payload,
    );
    return success(position);
  } catch (err) {
    return error(err);
  }
});
