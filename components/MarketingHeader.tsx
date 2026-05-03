import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="relative z-10 border-b border-border">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-2">
            <Image src="/logomark.png" alt="" width={22} height={22} />
          </div>
          <span className="text-[15px] font-medium text-foreground">Spotcoin</span>
        </Link>
        <Button variant="outline" size="sm" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </header>
  );
}
