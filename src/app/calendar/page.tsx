import Link from "next/link";
import { addDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/db";
import { rangesOverlap } from "@/lib/availability";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = 30;

const STATUS_CELL: Record<string, string> = {
  booking: "bg-amber-200 hover:bg-amber-300 border-amber-300",
  active: "bg-red-300 hover:bg-red-400 border-red-400",
  late: "bg-red-300 hover:bg-red-400 border-red-400",
};

const LEGEND: { label: string; className: string }[] = [
  { label: "Tersedia", className: "bg-emerald-100 border-emerald-200" },
  { label: "Booking", className: "bg-amber-200 border-amber-300" },
  { label: "Aktif / Terlambat", className: "bg-red-300 border-red-400" },
];

export default async function CalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [products, orders] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      include: {
        units: { where: { status: { notIn: ["maintenance", "lost"] } }, orderBy: { id: "asc" } },
      },
    }),
    prisma.order.findMany({
      where: { status: { in: ["booking", "active", "late"] } },
      include: { items: { select: { unitId: true, productId: true, quantity: true } } },
    }),
  ]);

  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));

  const assignedItems = orders.flatMap((o) =>
    o.items
      .filter((it) => it.unitId != null)
      .map((it) => ({
        unitId: it.unitId as number,
        status: o.status,
        startDate: o.startDate,
        endDate: o.endDate,
        orderId: o.id,
      }))
  );

  const rows = products.flatMap((p) =>
    p.units.map((u) => ({
      unitId: u.id,
      productName: p.name,
      serialNumber: u.serialNumber,
      condition: u.condition,
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender Ketersediaan"
        description="30 hari ke depan — satu baris per unit fisik, klik cell untuk buka order"
      />

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm border ${l.className}`} />
            {l.label}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jadwal Unit</CardTitle>
          <CardDescription>
            {format(today, "dd MMM yyyy", { locale: localeId })} —{" "}
            {format(days[days.length - 1], "dd MMM yyyy", { locale: localeId })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-5" aria-hidden />}
              title="Belum ada unit"
              description="Tambahkan produk beserta unit untuk melihat jadwal ketersediaan."
              ctaHref="/products/new"
              ctaLabel="Tambah produk"
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-max border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border-b border-r bg-muted/50 px-3 py-2 text-left font-medium backdrop-blur">
                      Unit
                    </th>
                    {days.map((d) => {
                      const weekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <th
                          key={d.toISOString()}
                          className={`border-b px-1 py-1.5 text-center font-normal ${
                            weekend ? "bg-muted/30 text-muted-foreground/60" : "text-muted-foreground"
                          }`}
                        >
                          <div className="font-semibold text-foreground">
                            {format(d, "d", { locale: localeId })}
                          </div>
                          <div>{format(d, "MMM", { locale: localeId })}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.unitId} className="hover:bg-muted/20">
                      <td className="sticky left-0 z-10 border-r bg-card px-3 py-1.5 whitespace-nowrap">
                        <span className="font-medium">{row.productName}</span>
                        {row.serialNumber && (
                          <span className="ml-1.5 text-muted-foreground">#{row.serialNumber}</span>
                        )}
                        <span className="ml-1.5 text-muted-foreground/70">({row.condition})</span>
                      </td>
                      {days.map((d) => {
                        const dayStart = d;
                        const dayEnd = addDays(d, 1);
                        const hit = assignedItems.find(
                          (it) =>
                            it.unitId === row.unitId &&
                            rangesOverlap(dayStart, dayEnd, it.startDate, it.endDate)
                        );
                        if (hit) {
                          return (
                            <td key={d.toISOString()} className="p-0.5">
                              <Link
                                href={`/orders/${hit.orderId}`}
                                title={`Buka order (${hit.status})`}
                                className={`block h-6 w-7 rounded-sm border transition-colors ${
                                  STATUS_CELL[hit.status] ?? "bg-zinc-200"
                                }`}
                              />
                            </td>
                          );
                        }
                        return (
                          <td key={d.toISOString()} className="p-0.5">
                            <span className="block h-6 w-7 rounded-sm border border-emerald-200 bg-emerald-100" />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
