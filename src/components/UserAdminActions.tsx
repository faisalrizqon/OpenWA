"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, ShieldCheck, ShieldOff } from "lucide-react";
import { createUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateUserForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>("mitra");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("role", role);
    startTransition(async () => {
      const res = await createUser(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push("/admin/users");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nama
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="mis. Budi"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="nama@mudahsewa.id"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
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
          required
          minLength={6}
          placeholder="min. 6 karakter"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="role" className="text-sm font-medium">
          Peran
        </label>
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
          <SelectTrigger id="role" className="h-9 w-full">
            <SelectValue placeholder="Pilih peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mitra">Mitra (operator)</SelectItem>
            <SelectItem value="admin">Admin (pemilik)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="size-4" aria-hidden />
          )}
          {pending ? "Menyimpan…" : "Tambah User"}
        </Button>
      </div>
    </form>
  );
}

export function UserRowActions({
  userId,
  name,
  role,
  active,
  selfId,
}: {
  userId: string;
  name: string;
  role: string;
  active: boolean;
  selfId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isSelf = userId === selfId;
  const isAdminRole = role === "admin";

  function toggleActive() {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("active", String(!active));
    startTransition(async () => {
      await import("@/actions/users").then((m) => m.toggleUserActive(fd));
      router.refresh();
    });
  }

  function deleteUser() {
    if (isSelf) return;
    if (!confirm(`Hapus user "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const fd = new FormData();
    fd.set("userId", userId);
    startTransition(async () => {
      await import("@/actions/users").then((m) => m.deleteUser(fd));
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending || isSelf}
        onClick={toggleActive}
        title={isSelf ? "Tidak bisa nonaktifkan diri sendiri" : active ? "Nonaktifkan" : "Aktifkan"}
        className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors disabled:opacity-40 ${
          active
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-muted bg-muted text-muted-foreground hover:bg-accent"
        }`}
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : active ? <ShieldCheck className="size-3" /> : <ShieldOff className="size-3" />}
        {active ? "Aktif" : "Nonaktif"}
      </button>
      <button
        type="button"
        disabled={pending || isSelf}
        onClick={deleteUser}
        title={isSelf ? "Tidak bisa hapus diri sendiri" : "Hapus user"}
        className="inline-flex h-7 items-center rounded-lg border border-destructive/20 bg-destructive/5 px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
      >
        Hapus
      </button>
    </div>
  );
}

// Re-export ShieldCheck / ShieldOff untuk tree-shake hint
export { ShieldCheck, ShieldOff };
