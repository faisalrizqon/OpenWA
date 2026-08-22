import { Camera, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Stok live per unit fisik"
        action={<HeaderLink href="/products/new" label="Tambah Produk" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
          <CardDescription>{products.length} produk terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <EmptyState
              icon={<Camera className="size-5" aria-hidden />}
              title="Belum ada produk"
              description="Tambahkan produk beserta unit fisiknya untuk mulai menerima order."
              ctaHref="/products/new"
              ctaLabel="Tambah produk pertama"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga (6/12/24/48 jam)</TableHead>
                  <TableHead className="text-center">Stok</TableHead>
                  <TableHead>Kondisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const available = p.units.filter((u) => u.status === "available").length;
                  const lowStock = available < p.stockThreshold;
                  const rented = p.units.filter((u) => u.status === "rented").length;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.category.name}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[p.price6h, p.price12h, p.price24h, p.price48h]
                          .map((v) => formatRupiah(v).replace(/\s/g, ""))
                          .join(" · ")}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                          <Package className="size-3.5 text-muted-foreground" aria-hidden />
                          {available}/{p.units.length}
                        </span>
                        {rented > 0 && (
                          <p className="text-xs text-muted-foreground">{rented} dirental</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {lowStock ? (
                          <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-red-800">
                            Stok menipis
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aman</span>
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
