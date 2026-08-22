import Link from "next/link";
import { prisma } from "@/lib/db";
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
    <div className="p-4 space-y-6 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Pelanggan</h1>
        <Link
          href="/customers/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Tambah Pelanggan
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pelanggan</CardTitle>
          <CardDescription>Klik WA untuk chat langsung</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              <p>Belum ada pelanggan.</p>
              <Link
                href="/customers/new"
                className="mt-2 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Tambah pelanggan pertama
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>WA</TableHead>
                  <TableHead>Jumlah Order</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://wa.me/62${c.phone.slice(1)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {c.phone}
                      </a>
                    </TableCell>
                    <TableCell>{c._count.orders}</TableCell>
                    <TableCell>
                      {c.isBlacklisted ? (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Blacklist
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">Normal</span>
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
