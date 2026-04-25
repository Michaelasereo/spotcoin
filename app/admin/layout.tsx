import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { prisma } from "@/lib/db";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (!session?.user?.id) {
    redirect("/login");
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
  if (shouldOnboard && pathname !== "/admin/onboarding") {
    redirect("/admin/onboarding");
  }

  return (
    <main className="min-h-screen bg-[--bg-base] pb-24">
      <div className="mx-auto w-full max-w-lg">{children}</div>
      <BottomNav isAdmin />
    </main>
  );
}
