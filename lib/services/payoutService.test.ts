import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
  },
  coinTransaction: {
    create: vi.fn(),
  },
  payoutWindow: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

describe("payoutService.markPayoutComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets tokens to zero, marks completed, and writes payout transaction", async () => {
    mockPrisma.user.findFirst
      .mockResolvedValueOnce({ id: "admin-1" })
      .mockResolvedValueOnce({
        id: "user-1",
        name: "Test User",
        email: "user@test.com",
        spotTokensEarned: 10,
      });
    mockPrisma.workspace.findUnique.mockResolvedValue({ tokenValueNaira: 1000 });
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        coinTransaction: { create: mockPrisma.coinTransaction.create },
        user: { update: mockPrisma.user.update },
      }),
    );
    mockPrisma.coinTransaction.create.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});

    const { payoutService } = await import("@/lib/services/payoutService");
    await payoutService.markPayoutComplete("admin-1", "user-1", "ws-1");

    expect(mockPrisma.coinTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PAYOUT",
          amount: -10,
        }),
      }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          spotTokensEarned: 0,
          payoutStatus: "COMPLETED",
        }),
      }),
    );
  });

  it("throws when target user is outside workspace", async () => {
    mockPrisma.user.findFirst
      .mockResolvedValueOnce({ id: "admin-1" })
      .mockResolvedValueOnce(null);
    mockPrisma.workspace.findUnique.mockResolvedValue({ tokenValueNaira: 1000 });

    const { payoutService } = await import("@/lib/services/payoutService");
    await expect(payoutService.markPayoutComplete("admin-1", "missing", "ws-1")).rejects.toMatchObject(
      { code: "USER_NOT_FOUND" },
    );
  });
});
