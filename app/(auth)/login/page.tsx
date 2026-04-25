"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setErrorMessage("Invalid email or password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[--bg-base] px-5">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center">
        <div className="mb-6 text-center">
          <p className="text-3xl">🪙</p>
          <h1 className="mt-3 text-2xl font-bold text-[--text-primary]">Spotcoin</h1>
          <p className="mt-2 text-[13px] text-[--text-secondary]">Recognise great work.</p>
        </div>

        <div className="w-full space-y-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] outline-none transition-colors focus:border-[--border-mid]"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] outline-none transition-colors focus:border-[--border-mid]"
          />
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSubmitting || !email || !password}
            className="flex w-full items-center justify-center rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[--bg-base] border-t-transparent" />
            ) : (
              "Sign in"
            )}
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 w-full rounded-2xl border border-[--error] bg-[--bg-card] px-4 py-3">
            <p className="text-sm text-[--text-primary]">{errorMessage}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
