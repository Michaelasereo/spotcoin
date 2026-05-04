import { beforeEach, describe, expect, it, vi } from "vitest";

const slackNotifyMocks = vi.hoisted(() => ({
  notifyRecognitionSentToSlack: vi.fn().mockResolvedValue(undefined),
}));

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  companyValue: {
    findFirst: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

const sendLowBalanceDMMock = vi.fn();
vi.mock("@/lib/slack/notifier", () => ({
  sendLowBalanceDM: sendLowBalanceDMMock,
}));

vi.mock("@/lib/slack/notifyRecognitionSent", () => slackNotifyMocks);

describe("recognitionService.send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    slackNotifyMocks.notifyRecognitionSentToSlack.mockResolvedValue(undefined);
  });

  it("handles happy path and updates balances", async () => {
    const tx = {
      user: {
        update: vi
          .fn()
          .mockResolvedValueOnce({
            id: "sender-1",
            name: "Sender User",
            slackUserId: "U123",
            coinsToGive: 3,
          })
          .mockResolvedValueOnce({ id: "recipient-1" }),
      },
      recognition: {
        create: vi.fn().mockResolvedValue({ id: "rec-1" }),
      },
      coinTransaction: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "sender-1",
        workspaceId: "ws-1",
        coinsToGive: 5,
        deletedAt: null,
      })
      .mockResolvedValueOnce({
        id: "recipient-1",
        workspaceId: "ws-1",
        deletedAt: null,
      });
    mockPrisma.companyValue.findFirst.mockResolvedValue({ id: "value-1" });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
    mockPrisma.workspace.findUnique.mockResolvedValue({ slackTeamId: "T123", targetChannelId: "C123" });

    const { recognitionService } = await import("@/lib/services/recognitionService");

    const result = await recognitionService.send("sender-1", {
      recipientId: "recipient-1",
      message: "Great work on the launch",
      valueId: "value-1",
      coinAmount: 2,
    });

    expect(result).toEqual({ id: "rec-1" });
    expect(tx.user.update).toHaveBeenCalledTimes(2);
    expect(tx.coinTransaction.createMany).toHaveBeenCalledTimes(1);
    expect(sendLowBalanceDMMock).toHaveBeenCalledTimes(1);
    expect(slackNotifyMocks.notifyRecognitionSentToSlack).toHaveBeenCalledWith("rec-1", "ws-1");
  });

  it("throws when sender equals recipient", async () => {
    const { recognitionService } = await import("@/lib/services/recognitionService");
    await expect(
      recognitionService.send("user-1", {
        recipientId: "user-1",
        message: "Self recognition",
        valueId: "value-1",
        coinAmount: 1,
      }),
    ).rejects.toMatchObject({ code: "SELF_RECOGNITION" });
  });

  it("throws for insufficient balance", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "sender-1",
        workspaceId: "ws-1",
        coinsToGive: 1,
        deletedAt: null,
      })
      .mockResolvedValueOnce({
        id: "recipient-1",
        workspaceId: "ws-1",
        deletedAt: null,
      });
    mockPrisma.companyValue.findFirst.mockResolvedValue({ id: "value-1" });

    const { recognitionService } = await import("@/lib/services/recognitionService");

    await expect(
      recognitionService.send("sender-1", {
        recipientId: "recipient-1",
        message: "Not enough balance",
        valueId: "value-1",
        coinAmount: 2,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
  });

  it("rolls back when recognition.create fails", async () => {
    const tx = {
      user: {
        update: vi
          .fn()
          .mockResolvedValueOnce({
            id: "sender-1",
            name: "Sender User",
            slackUserId: "U123",
            coinsToGive: 3,
          })
          .mockResolvedValueOnce({ id: "recipient-1" }),
      },
      recognition: {
        create: vi.fn().mockRejectedValue(new Error("create failed")),
      },
      coinTransaction: {
        createMany: vi.fn(),
      },
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "sender-1",
        workspaceId: "ws-1",
        coinsToGive: 5,
        deletedAt: null,
      })
      .mockResolvedValueOnce({
        id: "recipient-1",
        workspaceId: "ws-1",
        deletedAt: null,
      });
    mockPrisma.companyValue.findFirst.mockResolvedValue({ id: "value-1" });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const { recognitionService } = await import("@/lib/services/recognitionService");

    await expect(
      recognitionService.send("sender-1", {
        recipientId: "recipient-1",
        message: "Testing rollback path",
        valueId: "value-1",
        coinAmount: 2,
      }),
    ).rejects.toThrow("create failed");
    expect(tx.coinTransaction.createMany).not.toHaveBeenCalled();
  });
});
