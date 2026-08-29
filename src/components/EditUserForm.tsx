"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EditUserForm({
  user,
}: {
  user: { id: string; name: string; email: string; role: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(user.role);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("userId", user.id);
    fd.set("role", role);
    startTransition(async () => {
      const res = await updateUser(fd);
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
          defaultValue={user.name}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
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
          defaultValue={user.email}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Kata Sandi Baru
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Kosongkan jika tidak diubah"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="role" className="text-sm font-medium">
          Peran
        </label>
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
          <SelectTrigger id="role" className="h-9 w-full">
            <SelectValue />
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
            <Save className="size-4" aria-hidden />
          )}
          {pending ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
