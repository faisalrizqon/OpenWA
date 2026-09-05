import Link from "next/link";
import { ArrowLeft, Search, PackageSearch, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderHistoryList } from "@/components/OrderHistoryList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lacak Order — MudahSewa",
  description: "Cek status pesanan tanpa login — cukup nomor HP atau nomor order.",
};

interface TrackedOrder {
  orderNumber: string;
  status: string;
  startDate: Date;
  endDate: Date;
  total: number;
  customerName: string;
  customerPhone: string;
  productNames: string[];
}

function fmt(d: Date): string {
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function TrackPage({ searchParams }: PageProps<"/track">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";

  let orders: TrackedOrder[] = [];
  let searched = false;

  if (q) {
    searched = true;
    const looksLikeOrderNumber = /^ord/i.test(q);

    if (looksLikeOrderNumber) {
      // Cari langsung via nomor order
      const order = await prisma.order.findUnique({
        where: { orderNumber: q.toUpperCase() },
        include: {
          customer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      });
      if (order) {
        orders = [
          {
            orderNumber: order.orderNumber,
            status: order.status,
            startDate: order.startDate,
            endDate: order.endDate,
            total: order.items.reduce((s, it) => s + it.subtotal, 0),
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            productNames: order.items.map((it) => it.product.name),
          },
        ];
      }
    } else {
      // Cari via nomor HP: semua order milik customer dengan nomor tersebut
      const digits = q.replace(/[^\d]/g, "");
      if (digits.length >= 8) {
        const customers = await prisma.customer.findMany({
          where: { phone: digits },
          include: {
            orders: {
              orderBy: { createdAt: "desc" },
              include: {
                items: { include: { product: { select: { name: true } } } },
              },
            },
          },
        });
        orders = customers.flatMap((c) =>
          c.orders.map((o) => ({
            orderNumber: o.orderNumber,
            status: o.status,
            startDate: o.startDate,
            endDate: o.endDate,
            total: o.items.reduce((s, it) => s + it.subtotal, 0),
            customerName: c.name,
            customerPhone: c.phone,
            productNames: o.items.map((it) => it.product.name),
          }))
        );
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Katalog
      </Link>

      <div className="mb-8">
        <p className="font-mono text-xs font-bold tracking-widest text-primary">TRACKING</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Lacak Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cek status pesanan tanpa login — masukkan <strong>nomor WhatsApp</strong> (mis.
          081234567890) atau nomor order (mis. ORD-20260825-001).
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Form pencarian */}
        <form action="/track" method="get" className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nomor HP atau nomor order…"
              required
              className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
          <Button type="submit" className="h-10">Cari</Button>
        </form>

        {/* Hasil pencarian */}
        {searched && (
          <div className="mt-5 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed py-10 text-center">
                <PackageSearch className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
                <p className="mt-2 text-sm font-medium">Tidak ada pesanan ditemukan</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pastikan nomor HP sama persis dengan saat checkout (format 08xxx), atau nomor
                  order benar (contoh: ORD-20260825-001).
                </p>
              </div>
            ) : (
              <>
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5" aria-hidden />
                  Ditemukan {orders.length} pesanan
                  {orders[0]?.customerPhone && (
                    <span className="font-mono tabular-nums">a.n. {orders[0].customerName} ({orders[0].customerPhone})</span>
                  )}
                </p>
                {orders.map((o) => (
                  <Card key={o.orderNumber}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-mono text-base">
                        {o.orderNumber}
                        <StatusBadge status={o.status} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Pemesan</dt>
                          <dd className="text-right font-medium">{o.customerName}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">No. WhatsApp</dt>
                          <dd className="font-mono font-medium tabular-nums">{o.customerPhone}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Produk</dt>
                          <dd className="text-right font-medium">
                            {o.productNames.join(", ")}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Mulai sewa</dt>
                          <dd className="font-medium tabular-nums">{fmt(o.startDate)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Kembali</dt>
                          <dd className="font-medium tabular-nums">{fmt(o.endDate)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Total</dt>
                          <dd className="font-bold tabular-nums">{formatRupiah(o.total)}</dd>
                        </div>
                      </dl>
                      <Link
                        href={`/order-status/${encodeURIComponent(o.orderNumber)}`}
                        className="btn-retro inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Lihat Detail Lengkap
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* Riwayat perangkat */}
        <div className="mt-10">
          <h2 className="mb-3 text-base font-bold tracking-tight">Riwayat di Perangkat Ini</h2>
          <OrderHistoryList />
        </div>
      </div>
    </div>
  );
}
