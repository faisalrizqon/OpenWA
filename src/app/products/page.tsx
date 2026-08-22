import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
    include: { category: true, units: true },
  });

  return (
    <div className="p-4 space-y-6 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Produk</h1>
        <Link
          href="/products/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Tambah Produk
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
          <CardDescription>Stok live per unit fisik</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              <p>Belum ada produk.</p>
              <Link
                href="/products/new"
                className="mt-2 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Tambah produk pertama
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Kondisi Stok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const available = p.units.filter((u) => u.status === "available").length;
                  const lowStock = available < p.stockThreshold;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.sku}</TableCell>
                      <TableCell>{p.category.name}</TableCell>
                      <TableCell className="text-xs">
                        {formatRupiah(p.price6h)} / {formatRupiah(p.price12h)} /{" "}
                        {formatRupiah(p.price24h)} / {formatRupiah(p.price48h)}
                      </TableCell>
                      <TableCell>
                        {available}/{p.units.length}
                      </TableCell>
                      <TableCell>
                        {lowStock ? (
                          <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            Stok menipis
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">Aman</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
