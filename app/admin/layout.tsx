import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { pathnameFromHeaders, searchFromHeaders } from "@/lib/adminRequestPath";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const headerList = await headers();
  const pathname = pathnameFromHeaders(headerList);
  const search = searchFromHeaders(headerList);

  if (!session?.user?.id) {
    redirect(`/login${search}`);
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: {
      onboardingComplete: true,
      values: {
        select: { id: true },
      },
    },
  });

  const shouldOnboard = !!workspace && !workspace.onboardingComplete && workspace.values.length === 0;
  if (shouldOnboard && pathname && pathname !== "/admin/onboarding") {
    redirect("/admin/onboarding");
  }

  return (
    <AppShell isAdmin>{children}</AppShell>
  );
}
