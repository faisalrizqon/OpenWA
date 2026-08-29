import Link from "next/link";
import { prisma } from "@/lib/db";
import { OrderForm } from "@/components/OrderForm";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";

export default async function NewOrderPage({
  searchParams,
}: PageProps<"/admin/orders/new">) {
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;

  const notifications: PageNotification[] = [];
  if (error) notifications.push({ type: "error", message: decodeURIComponent(error) });

  // Preview nomor order berikutnya (format lokal ORD-YYYYMMDD-NNN)
  const now = new Date();
  const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const todayCount = await prisma.order.count({
    where: { createdAt: { gte: localStart, lt: localEnd } },
  });
  const pad = (n: number) => String(n).padStart(2, "0");
  const previewOrderNumber = `ORD-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${String(todayCount + 1).padStart(3, "0")}`;

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      include: { units: { where: { status: { notIn: ["maintenance", "lost"] } } } },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Order"
        description="Harga tier otomatis per durasi — stok dicek live"
        backHref="/admin/orders"
      />
      <PageNotifier notifications={notifications} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Order Baru</CardTitle>
              <CardDescription>Durasi tier: 6 / 12 / 24 / 48 jam, di atasnya kelipatan harian</CardDescription>
            </div>
            <div className="rounded-lg border bg-muted/50 px-3 py-1.5 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Nomor Order (perkiraan)
              </p>
              <p className="font-mono text-sm font-bold tabular-nums">{previewOrderNumber}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada produk aktif.{" "}
              <Link href="/admin/products/new" className="font-medium text-primary hover:underline">
                Tambah produk dulu
              </Link>
              .
            </p>
          ) : (
            <OrderForm
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                price6h: p.price6h,
                price12h: p.price12h,
                price24h: p.price24h,
                price48h: p.price48h,
                availableUnits: p.units.length,
              }))}
              customers={customers.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                isBlacklisted: c.isBlacklisted,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
