"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Could not reset password.");
        setLoading(false);
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-[500px] w-full max-w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-[500px] w-full max-w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,rgba(200,160,120,0.04)_0%,transparent_100%)]" />

      <div className="relative z-[1] flex w-full max-w-[420px] flex-col items-center">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-border bg-card-2">
            <Image src="/logomark.png" alt="" width={22} height={22} />
          </div>
          <p className="text-[15px]">
            <span className="font-medium text-foreground">Spotcoin</span>
            <span className="font-normal text-muted"> Internal</span>
          </p>
        </div>

        <h1 className="mb-2 text-center text-[28px] font-bold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="mb-8 text-center text-[14px] leading-relaxed text-muted">
          Choose a strong password you haven&apos;t used elsewhere.
        </p>

        {!token ? (
          <section className="w-full rounded-[20px] border border-border bg-card px-6 py-8 text-center">
            <p className="mb-6 text-[14px] leading-relaxed text-muted">
              This link is missing a token. Open the link from your email or request a new reset.
            </p>
            <Link
              href="/forgot-password"
              className="text-[14px] font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Request password reset
            </Link>
          </section>
        ) : (
          <section className="w-full rounded-[20px] border border-border bg-card px-6 py-7">
            <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-[#c0c0c0]">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-[12px] border border-border bg-input px-4 py-3.5 text-[14px] text-foreground outline-none placeholder:text-white/18 focus:border-[rgba(255,255,255,0.2)] focus:bg-[#222]"
            />

            <label htmlFor="confirm" className="mb-2 block text-[13px] font-medium text-[#c0c0c0]">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mb-5 w-full rounded-[12px] border border-border bg-input px-4 py-3.5 text-[14px] text-foreground outline-none placeholder:text-white/18 focus:border-[rgba(255,255,255,0.2)] focus:bg-[#222]"
            />

            {error ? (
              <div className="mb-4 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-destructive">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              disabled={loading || !password || !confirm}
              onClick={submit}
              className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[#efefef] text-[15px] font-semibold text-[#0a0a0a] transition-opacity disabled:opacity-60"
            >
              {loading ? (
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/15 border-t-[#0a0a0a]"
                  aria-hidden
                />
              ) : (
                "Update password"
              )}
            </button>

            <Link
              href="/login"
              className="mt-5 flex items-center justify-center gap-2 text-center text-[13px] text-muted hover:text-foreground"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
