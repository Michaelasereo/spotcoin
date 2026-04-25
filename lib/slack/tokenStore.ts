import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { AppError } from "@/lib/errors";

export async function getTokenForTeam(slackTeamId: string): Promise<string> {
  const installation = await prisma.slackInstallation.findUnique({
    where: { slackTeamId },
    select: { botToken: true },
  });

  if (!installation?.botToken) {
    throw new AppError("Slack installation token not found", "SLACK_TOKEN_NOT_FOUND", 404);
  }

  return decrypt(installation.botToken);
}
