import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="app-top-glow relative flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16">
      <div className="relative z-[1] w-full max-w-sm space-y-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">404</p>
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="This route does not exist in Spotcoin. Try heading back to your dashboard."
        />
        <Button asChild variant="outline" className="w-full">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
