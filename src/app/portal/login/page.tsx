"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, Lock, PackageSearch } from "lucide-react";
import { signIn } from "next-auth/react";

export default function PortalLoginPage() {
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-10 md:py-16">
      {/* Kartu login — tanpa logo sendiri (logo sudah ada di header layout portal) */}
      <div className="w-full rounded-2xl border border-border/70 bg-card/85 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <div className="mb-6 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Lock className="size-7" aria-hidden />
          </span>
          <h1 className="mt-3 text-xl font-bold tracking-tight">Portal Pelanggan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk lihat riwayat sewa dan review pesanan
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
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
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
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
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={pending || !phone || !password}
            className="btn-retro inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Lock className="size-4" aria-hidden />
            )}
            {pending ? "Masuk…" : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Belum punya akun? Chat admin via WhatsApp untuk daftar.
        </p>
      </div>

      {/* Cross-link: tidak wajib login untuk sekadar melacak order */}
      <Link
        href="/track"
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <PackageSearch className="size-4" aria-hidden />
        Tidak punya akun? Lacak order tanpa login
      </Link>
    </div>
  );
}
