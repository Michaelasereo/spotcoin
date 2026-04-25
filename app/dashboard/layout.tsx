import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[--bg-base] pb-24">
      <div className="mx-auto w-full max-w-lg">{children}</div>
      <BottomNav isAdmin={session.user.role === "ADMIN"} />
    </main>
  );
}
