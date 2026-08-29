import Link from "next/link";
import { ShieldCheck, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRowActions } from "@/components/UserAdminActions";
import { format } from "date-fns";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";

export default async function UsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  await requireAdmin();
  const session = await auth();

  const raw = await searchParams;
  const error = Array.isArray(raw.error) ? raw.error[0] : raw.error;
  const created = Array.isArray(raw.created) ? raw.created[0] : raw.created;

  const notifications: PageNotification[] = [];
  if (error === "forbidden") {
    notifications.push({ type: "error", message: "Akses ditolak — halaman ini hanya untuk admin." });
  }
  if (created === "1") {
    notifications.push({ type: "success", message: "User baru berhasil dibuat." });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { handledOrders: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna"
        description="Kelola akun admin & mitra yang bisa akses panel"
        action={<HeaderLink href="/admin/users/new" label="Tambah User" />}
      />
      <PageNotifier notifications={notifications} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
            Daftar Pengguna
          </CardTitle>
          <CardDescription>
            Admin = akses penuh (laporan, harga, user) · Mitra = operasional (order, return)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <UserPlus className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold">Belum ada user</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Jalankan <code className="rounded bg-muted px-1">npm run db:seed-users</code> atau
                tambah manual.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead className="text-center">Order Ditangani</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={!u.active ? "opacity-50" : undefined}>
                    <TableCell>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {u.role === "admin" ? "Admin" : "Mitra"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {u._count.handledOrders}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(u.createdAt), "dd MMMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserRowActions
                        userId={u.id}
                        name={u.name}
                        role={u.role}
                        active={u.active}
                        selfId={session?.user?.id ?? ""}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
