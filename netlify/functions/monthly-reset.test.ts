import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  workspace: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../../lib/db", () => ({
  prisma: mockPrisma,
}));

describe("monthly-reset function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets coinsToGive without touching spotTokensEarned", async () => {
    mockPrisma.workspace.findMany.mockResolvedValue([{ id: "ws-1", monthlyAllowance: 5 }]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);

    const tx = {
      user: {
        update: vi.fn().mockResolvedValue({}),
      },
      coinTransaction: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const monthlyReset = (await import("./monthly-reset.mts")).default;
    await monthlyReset();

    expect(tx.user.update).toHaveBeenCalled();
    const updateCalls = tx.user.update.mock.calls.map((call: any[]) => call[0]);
    for (const call of updateCalls) {
      expect(call.data).toHaveProperty("coinsToGive", 5);
      expect(call.data).not.toHaveProperty("spotTokensEarned");
    }
  });
});
