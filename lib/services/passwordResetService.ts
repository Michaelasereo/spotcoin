import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { Resend } from "resend";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { resendFromAddress } from "@/lib/resendFrom";

const TOKEN_BYTES = 32;
const RESET_LINK_TTL_HOURS = 1;
const MIN_PASSWORD_LENGTH = 8;

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export function hashResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export const passwordResetService = {
  async requestReset(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalized, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return;
    }

    if (!resendClient) {
      console.warn("[passwordReset] RESEND_API_KEY not set; cannot send reset email");
      return;
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_LINK_TTL_HOURS * 60 * 60 * 1000);

    const record = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    const resetUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await resendClient.emails.send({
        from: resendFromAddress(),
        to: user.email,
        subject: "Reset your Spotcoin password",
        text: [
          "You asked to reset your Spotcoin password.",
          "",
          `Open this link (expires in ${RESET_LINK_TTL_HOURS} hour):`,
          resetUrl,
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
      });
    } catch (err) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
      console.error("[passwordReset] Failed to send email", err);
    }
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const trimmed = newPassword.trim();
    if (trimmed.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        "VALIDATION_ERROR",
        400,
      );
    }

    const tokenHash = hashResetToken(rawToken.trim());
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, deletedAt: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date() || record.user.deletedAt) {
      throw new AppError("Invalid or expired reset link", "INVALID_TOKEN", 400);
    }

    const passwordHash = await hash(trimmed, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } });
    });
  },
};
