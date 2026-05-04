import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCompare = vi.fn();
const mockHash = vi.fn();

vi.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
  hash: (...args: unknown[]) => mockHash(...args),
}));

const mockTx = {
  user: { update: vi.fn() },
  passwordResetToken: { deleteMany: vi.fn() },
};

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

describe("userService.changeOwnPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) => {
      await cb(mockTx);
    });
    mockHash.mockResolvedValue("new-hash");
  });

  it("updates hash and clears reset tokens when current password matches", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      passwordHash: "old-hash",
    });
    mockCompare.mockResolvedValue(true);

    const { userService } = await import("@/lib/services/userService");

    await userService.changeOwnPassword("user-1", "old-plain", "new-secret-9");

    expect(mockCompare).toHaveBeenCalledWith("old-plain", "old-hash");
    expect(mockHash).toHaveBeenCalledWith("new-secret-9", 12);
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "new-hash" },
    });
    expect(mockTx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("throws when current password is wrong", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      passwordHash: "old-hash",
    });
    mockCompare.mockResolvedValue(false);

    const { userService } = await import("@/lib/services/userService");

    await expect(userService.changeOwnPassword("user-1", "wrong", "new-secret-9")).rejects.toMatchObject({
      code: "INVALID_CURRENT_PASSWORD",
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws when user is missing", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const { userService } = await import("@/lib/services/userService");

    await expect(userService.changeOwnPassword("missing", "a", "new-secret-9")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("throws when new password equals current password", async () => {
    const { userService } = await import("@/lib/services/userService");

    await expect(userService.changeOwnPassword("user-1", "same-one", "same-one")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("throws when trimmed new password is too short", async () => {
    const { userService } = await import("@/lib/services/userService");

    await expect(userService.changeOwnPassword("user-1", "old", "short")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
