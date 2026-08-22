import Link from "next/link";
import { prisma } from "@/lib/db";
import { OrderForm } from "@/components/OrderForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewOrderPage({
  searchParams,
}: PageProps<"/orders/new">) {
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      include: { units: { where: { status: { notIn: ["maintenance", "lost"] } } } },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-4 space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Buat Order</h1>
        <p className="mt-1 text-sm text-zinc-500">
          <Link href="/orders" className="hover:underline">
            ← Kembali ke daftar order
          </Link>
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {decodeURIComponent(error)}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Order Baru</CardTitle>
          <CardDescription>
            Harga mengikuti tier durasi (6/12/24/48 jam) — bisa di-override per item
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Belum ada produk aktif.{" "}
              <Link href="/products/new" className="text-blue-600 hover:underline">
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
