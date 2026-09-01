import Link from "next/link";
import { Camera, Package } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductRowActions } from "@/components/ProductAdminActions";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const raw = await searchParams;
  const deleted = Array.isArray(raw.deleted) ? raw.deleted[0] : raw.deleted;
  const error = Array.isArray(raw.error) ? raw.error[0] : raw.error;

  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "mitra")) {
    throw new Error("UNAUTHORIZED");
  }
  const isAdmin = session.user.role === "admin";

  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
    include: { category: true, units: true },
  });
  const notifications: PageNotification[] = [];
  if (deleted === "1") {
    notifications.push({ type: "success", message: "Produk berhasil dihapus." });
  }
  if (error) {
    notifications.push({ type: "error", message: decodeURIComponent(error) });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Stok live per unit fisik. Buka menu titik tiga pada kolom aksi untuk mengedit, menyembunyikan, atau menghapus produk."
        action={isAdmin ? <HeaderLink href="/admin/products/new" label="Tambah Produk" /> : undefined}
      />
      <PageNotifier notifications={notifications} />

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
              ctaHref={isAdmin ? "/admin/products/new" : undefined}
              ctaLabel={isAdmin ? "Tambah produk pertama" : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga (6/12/24/48 jam)</TableHead>
                  <TableHead className="text-center">Stok</TableHead>
                  <TableHead>Status Stok</TableHead>
                  {isAdmin && <TableHead className="text-center">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const available = p.units.filter((u) => u.status === "available").length;
                  const lowStock = available < p.stockThreshold;
                  const rented = p.units.filter((u) => u.status === "rented").length;
                  return (
                    <TableRow key={p.id} className={cn(!p.active && "opacity-60")}>
                      <TableCell>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                        {!p.active && (
                          <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800">
                            Nonaktif
                          </Badge>
                        )}
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
                          <span className="text-xs text-muted-foreground">Stok aman</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isAdmin && (
                          <div className="flex justify-center">
                            <ProductRowActions
                              productId={p.id}
                              productName={p.name}
                              active={p.active}
                            />
                          </div>
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
