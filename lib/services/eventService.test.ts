import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  workspaceEvent: {
    findFirst: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
  eventComment: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

describe("eventService.addComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects empty message after sanitize", async () => {
    mockPrisma.workspaceEvent.findFirst.mockResolvedValue({ id: "e1", workspaceId: "w1", createdById: "u0" });
    mockPrisma.user.findFirst.mockResolvedValue({ id: "u1" });

    const { eventService } = await import("@/lib/services/eventService");

    await expect(eventService.addComment("e1", "w1", "u1", "   ")).rejects.toMatchObject({
      code: "INVALID_COMMENT",
    });
    expect(mockPrisma.eventComment.create).not.toHaveBeenCalled();
  });
});
