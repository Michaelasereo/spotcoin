import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockEmailsSend } = vi.hoisted(() => {
  const mockEmailsSend = vi.fn().mockResolvedValue({});
  const mockPrisma = {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockPrisma, mockEmailsSend };
});

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockEmailsSend };
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    RESEND_API_KEY: "re_test_key",
    NEXT_PUBLIC_APP_URL: "https://app.example.com",
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { hashResetToken, passwordResetService } from "@/lib/services/passwordResetService";

describe("passwordResetService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailsSend.mockResolvedValue({});
    mockPrisma.passwordResetToken.delete.mockResolvedValue({});
  });

  describe("requestReset", () => {
    it("does nothing when user is missing", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await passwordResetService.requestReset("missing@example.com");

      expect(mockPrisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();
      expect(mockEmailsSend).not.toHaveBeenCalled();
    });

    it("creates token and sends email when user exists", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-1",
        email: "person@company.com",
      });
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({ id: "tok-1" });

      await passwordResetService.requestReset("person@company.com");

      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
      const createArg = mockPrisma.passwordResetToken.create.mock.calls[0][0].data;
      expect(createArg.userId).toBe("user-1");
      expect(createArg.tokenHash).toHaveLength(64);
      expect(mockEmailsSend).toHaveBeenCalled();
      const emailArg = mockEmailsSend.mock.calls[0][0];
      expect(emailArg.to).toBe("person@company.com");
      expect(emailArg.text).toContain("https://app.example.com/reset-password?token=");
    });

    it("removes token when email send fails", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-1",
        email: "person@company.com",
      });
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({ id: "tok-1" });
      mockEmailsSend.mockRejectedValueOnce(new Error("smtp down"));

      await passwordResetService.requestReset("person@company.com");

      expect(mockPrisma.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: "tok-1" } });
    });
  });

  describe("resetPassword", () => {
    it("rejects short passwords", async () => {
      await expect(passwordResetService.resetPassword("any-token", "short")).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });

    it("rejects invalid token", async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        passwordResetService.resetPassword("bad-token", "longenough1"),
      ).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    });

    it("updates password and clears tokens on success", async () => {
      const raw = "valid-raw-token";
      const tokenHash = hashResetToken(raw);
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: "pr-1",
        userId: "user-1",
        tokenHash,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        user: { id: "user-1", deletedAt: null },
      });

      const txUserUpdate = vi.fn().mockResolvedValue({});
      const txTokenDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: { user: { update: typeof txUserUpdate }; passwordResetToken: { deleteMany: typeof txTokenDeleteMany } }) => Promise<void>) => {
          await fn({
            user: { update: txUserUpdate },
            passwordResetToken: { deleteMany: txTokenDeleteMany },
          });
        },
      );

      await passwordResetService.resetPassword(raw, "new-password-ok");

      expect(txUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ passwordHash: expect.any(String) }),
        }),
      );
      expect(txTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    });
  });
});
