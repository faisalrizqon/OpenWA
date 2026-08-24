import Link from "next/link";
import { Users, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerRowActions } from "@/components/CustomerAdminActions";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomersPage({
  searchParams,
}: PageProps<"/admin/customers">) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "mitra")) {
    throw new Error("UNAUTHORIZED");
  }
  const isAdmin = session.user.role === "admin";
  const raw = await searchParams;
  const q = Array.isArray(raw.q) ? raw.q[0] : raw.q ?? "";
  const deleted = Array.isArray(raw.deleted) ? raw.deleted[0] : raw.deleted;

  // SQLite LIKE sudah case-insensitive untuk ASCII — tanpa mode "insensitive"
  const where = q?.trim()
    ? {
        OR: [
          { name: { contains: q.trim() } },
          { phone: { contains: q.trim() } },
        ],
      }
    : undefined;
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelanggan"
        description="Kontak WA, riwayat order, dan status blacklist"
        action={<HeaderLink href="/admin/customers/new" label="Tambah Pelanggan" />}
      />

      {deleted === "1" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Pelanggan berhasil dihapus.
        </p>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
              <Search className="size-4 text-muted-foreground" aria-hidden />
              <input
                type="text"
                name="q"
                placeholder="Cari nama atau nomor WA..."
                defaultValue={q}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {q && (
                <Link
                  href="/admin/customers"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Link>
              )}
            </div>
            <Button type="submit">Cari</Button>
          </form>
          {q && (
            <p className="mt-2 text-xs text-muted-foreground">
              Menampilkan hasil pencarian untuk “{q}” · {customers.length} pelanggan ditemukan
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pelanggan</CardTitle>
          <CardDescription>
            {q ? `Hasil: ${customers.length}` : `${customers.length} pelanggan terdaftar`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" aria-hidden />}
              title={!q ? "Belum ada pelanggan" : "Tidak ada hasil"}
              description={
                !q
                  ? "Tambahkan pelanggan untuk mencatat kontak dan dokumen identitas."
                  : "Coba ubah kata kunci pencarian."
              }
              ctaHref={
                !q ? "/admin/customers/new" : undefined
              }
              ctaLabel={
                !q ? "Tambah pelanggan pertama" : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak WA</TableHead>
                  <TableHead className="text-center">Jumlah Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.isBlacklisted && (
                        <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                          Blacklist
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`https://wa.me/62${c.phone.slice(1)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
                      >
                        <WhatsAppIcon className="size-3.5" aria-hidden />
                        {c.phone}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-medium tabular-nums">
                      {c._count.orders}
                    </TableCell>
                    <TableCell>
                      {c.isBlacklisted ? (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Blacklist
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Normal</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomerRowActions
                        customerId={c.id}
                        customerName={c.name}
                        orderCount={c._count.orders}
                        isAdmin={isAdmin}
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
