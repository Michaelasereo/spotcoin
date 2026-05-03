import Link from "next/link";

export function MarketingLegalFooter() {
  return (
    <footer className="border-t border-border py-8">
      <nav
        className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-6 gap-y-2 px-5 text-xs text-muted"
        aria-label="Legal and product links"
      >
        <Link href="/slack" className="hover:text-foreground">
          Slack app
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/support" className="hover:text-foreground">
          Support
        </Link>
        <Link href="/login" className="hover:text-foreground">
          Sign in
        </Link>
      </nav>
    </footer>
  );
}
