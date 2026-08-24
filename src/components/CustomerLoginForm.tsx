"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, Lock, LogIn, PackageSearch } from "lucide-react";
import { signIn } from "next-auth/react";

/** Form login portal customer (No. HP + password) — tampilan sama seperti /login admin */
export function CustomerLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("customer", { phone, password, redirect: false });
      if (res?.error) {
        setError("No. HP atau kata sandi salah.");
        return;
      }
      router.push("/portal");
      router.refresh();
    });
  }

  return (
    <>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            No. WhatsApp
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="off"
            required
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Kata Sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={pending || !phone || !password}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="size-4" aria-hidden />
          )}
          {pending ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <Link
        href="/track"
        className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <PackageSearch className="size-4" aria-hidden />
        Tidak punya akun? Lacak order tanpa login
      </Link>
    </>
  );
}
