"use client";

import { useTransition } from "react";
import { Loader2, Power } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton({
  label = "Keluar",
  redirectTo = "/login",
  iconOnly = false,
}: {
  label?: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut({ redirectTo }))}
      title={iconOnly ? "Keluar" : undefined}
      aria-label={iconOnly ? "Keluar" : undefined}
      className={`flex cursor-pointer items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60 ${
        iconOnly ? "mx-auto size-11 justify-center" : "w-full gap-2.5 border border-border/70 px-3 py-2"
      }`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Power className="size-4 shrink-0" aria-hidden />
      )}
      {!iconOnly && (pending ? "Keluar…" : label)}
    </button>
  );
}
