-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN "votesAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_workspaceId_username_key" ON "User"("workspaceId", "username");
