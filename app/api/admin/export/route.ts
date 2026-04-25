import { error } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = requireAdmin(async (_request, _context, session) => {
  try {
    const users = await prisma.user.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: {
        name: true,
        email: true,
        role: true,
        coinsToGive: true,
        spotTokensEarned: true,
        deletedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const header = "Name,Email,Role,CoinsToGive,SpotTokensEarned,Status";
    const rows = users.map((user) =>
      [
        user.name,
        user.email,
        user.role,
        user.coinsToGive,
        user.spotTokensEarned,
        user.deletedAt ? "Inactive" : "Active",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="spotcoin-export.csv"',
      },
    });
  } catch (err) {
    return error(err);
  }
});
