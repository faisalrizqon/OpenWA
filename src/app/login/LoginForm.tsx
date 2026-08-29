"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2, LogIn, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/admin";
  const errorParam = search.get("error");
  
  // Check for logout success message
  const logoutSuccess = search.get("logout") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "CredentialsSignin" ? "Email atau kata sandi salah." : null
  );
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email atau kata sandi salah.");
        return;
      }
      router.push(callbackUrl);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Camera className="size-8 text-primary" aria-hidden />
          <span className="text-lg font-bold tracking-tight">MudahSewa</span>
        </Link>

        {logoutSuccess && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
            <p className="font-medium">Berhasil keluar!</p>
          </div>
        )}
        
        <div className="glass rounded-2xl border border-border/70 p-6 shadow-sm">
          <h1 className="text-lg font-bold tracking-tight">Login Administrator</h1>
          <p className="mt-1 text-xs text-muted-foreground">Masukkan email dan kata sandi Anda untuk melanjutkan</p>
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={pending}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="admin@mudahsewa.id"
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium">Kata Sandi</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={pending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="size-4" aria-hidden />
                  Login
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground/70">
            Panel internal staf MudahSewa · akses terbatas
          </p>
        </div>
      </div>
    </div>
  );
}
