"use client";

import { useTransition } from "react";
import { Loader2, Power } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton({ label = "Keluar", redirectTo = "/login" }: { label?: string; redirectTo?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut({ redirectTo }))}
      className="flex w-full items-center gap-2.5 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Power className="size-4 shrink-0" aria-hidden />
      )}
      {pending ? "Keluar…" : label}
    </button>
  );
}
