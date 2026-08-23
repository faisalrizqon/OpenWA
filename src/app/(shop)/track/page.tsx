import Link from "next/link";
import { Search, PackageSearch } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderHistoryList } from "@/components/OrderHistoryList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lacak Order — MudahSewa",
  description: "Cek status pesananmu tanpa login — cukup masukkan nomor order.",
};

export default async function TrackPage({ searchParams }: PageProps<"/track">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";

  let result: {
    found: boolean;
    order?: {
      orderNumber: string;
      status: string;
      startDate: Date;
      endDate: Date;
      total: number;
      customerName: string;
    };
  } | null = null;

  if (q) {
    const order = await prisma.order.findUnique({
      where: { orderNumber: q.toUpperCase() },
      include: {
        customer: { select: { name: true } },
        items: { select: { subtotal: true } },
      },
    });
    if (order) {
      result = {
        found: true,
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          startDate: order.startDate,
          endDate: order.endDate,
          total: order.items.reduce((s, it) => s + it.subtotal, 0),
          customerName: order.customer.name,
        },
      };
    } else {
      result = { found: false };
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6">
        <p className="font-mono text-xs font-bold tracking-widest text-primary">TRACKING</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Lacak Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cek status pesanan tanpa login — masukkan nomor order (contoh: ORD-20260824-001).
        </p>
      </div>

      {/* Form pencarian */}
      <form action="/track" method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Masukkan nomor order…"
            required
            className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 font-mono text-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <Button type="submit" className="h-10">Cari</Button>
      </form>

      {/* Hasil pencarian */}
      {result && (
        <div className="mt-5">
          {result.found && result.order ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-base">{result.order.orderNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={result.order.status} />
                  <span className="text-sm text-muted-foreground">
                    a.n. {result.order.customerName}
                  </span>
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Mulai sewa</dt>
                    <dd className="font-medium">
                      {result.order.startDate.toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Kembali</dt>
                    <dd className="font-medium">
                      {result.order.endDate.toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-bold tabular-nums">{formatRupiah(result.order.total)}</dd>
                  </div>
                </dl>
                <Link
                  href={`/order-status/${encodeURIComponent(result.order.orderNumber)}`}
                  className="btn-retro inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Lihat Detail Lengkap
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-2xl border border-dashed py-10 text-center">
              <PackageSearch className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
              <p className="mt-2 text-sm font-medium">Order tidak ditemukan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pastikan nomor order benar (contoh: ORD-20260824-001).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Riwayat perangkat */}
      <div className="mt-10">
        <h2 className="mb-3 text-base font-bold tracking-tight">Riwayat di Perangkat Ini</h2>
        <OrderHistoryList />
      </div>
    </div>
  );
}
