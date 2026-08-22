import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelanggan"
        description="Kontak WA, riwayat order, dan status blacklist"
        action={<HeaderLink href="/customers/new" label="Tambah Pelanggan" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pelanggan</CardTitle>
          <CardDescription>{customers.length} pelanggan terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" aria-hidden />}
              title="Belum ada pelanggan"
              description="Tambahkan pelanggan untuk mencatat kontak dan dokumen identitas."
              ctaHref="/customers/new"
              ctaLabel="Tambah pelanggan pertama"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak WA</TableHead>
                  <TableHead className="text-center">Jumlah Order</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <a
                        href={`/customers/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </a>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://wa.me/62${c.phone.slice(1)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline"
                      >
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
                          <path d="M12.04 2a9.9 9.9 0 0 0-8.51 14.96L2 22l5.18-1.5A9.96 9.96 0 1 0 12.04 2Zm5.8 14.2c-.25.7-1.45 1.33-2 1.38-.5.05-1.15.24-3.86-.8-3.27-1.3-5.36-4.64-5.52-4.85-.16-.2-1.32-1.75-1.32-3.34 0-1.6.84-2.38 1.13-2.7.3-.33.65-.4.86-.4h.62c.2 0 .47-.07.72.55.27.65.9 2.24.98 2.4.08.16.13.35.02.56-.1.2-.15.33-.3.5l-.45.53c-.15.15-.3.32-.13.63.16.3.73 1.22 1.57 1.97 1.08.96 1.99 1.26 2.28 1.4.28.15.45.13.61-.04.17-.16.72-.84.91-1.13.2-.28.4-.23.66-.13.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.12.07.7-.18 1.38Z" />
                        </svg>
                        {c.phone}
                      </a>
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
