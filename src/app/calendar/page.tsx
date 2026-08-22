import { Fragment } from "react";
import Link from "next/link";
import { addDays, format, isSameDay, isWeekend } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarDays, Camera } from "lucide-react";
import { prisma } from "@/lib/db";
import { rangesOverlap } from "@/lib/availability";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CalendarNav } from "@/components/CalendarNav";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAYS = 30;

const STATUS_CELL: Record<string, string> = {
  booking: "bg-amber-400/90 hover:bg-amber-500 ring-amber-500/30",
  active: "bg-rose-500/90 hover:bg-rose-600 ring-rose-500/30",
  late: "bg-rose-600 hover:bg-rose-700 ring-rose-600/40",
};

const STATUS_LABEL: Record<string, string> = {
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
};

const LEGEND: { label: string; className: string }[] = [
  { label: "Tersedia", className: "bg-emerald-100 ring-1 ring-emerald-300" },
  { label: "Booking", className: "bg-amber-400/90" },
  { label: "Aktif", className: "bg-rose-500/90" },
  { label: "Terlambat", className: "bg-rose-600" },
];

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const startParam = Array.isArray(sp.start) ? sp.start[0] : sp.start;

  const start = startParam ? new Date(`${startParam}T00:00`) : new Date();
  if (isNaN(start.getTime())) start.setTime(Date.now());
  start.setHours(0, 0, 0, 0);

  const windowEnd = addDays(start, DAYS);

  const [products, orders] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      include: {
        units: { where: { status: { notIn: ["maintenance", "lost"] } }, orderBy: { id: "asc" } },
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["booking", "active", "late"] },
        startDate: { lt: windowEnd },
        endDate: { gt: start },
      },
      include: { items: { select: { unitId: true, productId: true } } },
    }),
  ]);

  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const groups = products
    .filter((p) => p.units.length > 0)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      units: p.units.map((u) => ({
        unitId: u.id,
        serialNumber: u.serialNumber,
        condition: u.condition,
      })),
    }));

  const totalUnits = groups.reduce((s, g) => s + g.units.length, 0);
  const startYmd = format(start, "yyyy-MM-dd");

  const cellFor = (unitId: number, day: Date) => {
    const dayEnd = addDays(day, 1);
    return assignedItems.find(
      (it) => it.unitId === unitId && rangesOverlap(day, dayEnd, it.startDate, it.endDate)
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender Ketersediaan"
        description="Jadwal per unit fisik — klik sel berwarna untuk membuka order terkait."
      />

      <Card>
        <CardContent className="space-y-4">
          <CalendarNav start={startYmd} spanDays={DAYS} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-2">
                <span className={cn("inline-block size-3.5 rounded-md", l.className)} />
                {l.label}
              </span>
            ))}
            <span className="ml-auto flex items-center gap-2">
              <span className="inline-block size-3.5 rounded-md bg-primary/15 ring-1 ring-primary/40" />
              Hari ini
            </span>
          </div>
        </CardContent>
      </Card>

      {totalUnits === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<CalendarDays className="size-5" aria-hidden />}
              title="Belum ada unit"
              description="Tambahkan produk beserta unit untuk melihat jadwal ketersediaan."
              ctaHref="/products/new"
              ctaLabel="Tambah produk"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 min-w-52 border-b bg-card px-4 py-3 text-left align-bottom text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Unit
                    </th>
                    {days.map((d) => {
                      const weekend = isWeekend(d);
                      const isToday = isSameDay(d, today);
                      return (
                        <th
                          key={d.toISOString()}
                          className={cn(
                            "border-b border-l px-0 py-2 text-center font-normal",
                            weekend && "bg-muted/40",
                            isToday && "bg-primary/10"
                          )}
                        >
                          <div className="text-[10px] uppercase text-muted-foreground/70">
                            {format(d, "EEEEEE", { locale: localeId })}
                          </div>
                          <div
                            className={cn(
                              "text-sm font-semibold tabular-nums",
                              isToday ? "text-primary" : "text-foreground"
                            )}
                          >
                            {format(d, "d")}
                          </div>
                          <div className="text-[10px] text-muted-foreground/60">
                            {format(d, "MMM", { locale: localeId })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.productId}>
                      <tr>
                        <td
                          colSpan={days.length + 1}
                          className="sticky left-0 z-10 border-b border-t bg-muted/50 px-4 py-1.5"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/80">
                            <Camera className="size-3.5 text-primary" aria-hidden />
                            {group.productName}
                            <span className="font-medium text-muted-foreground">
                              · {group.units.length} unit
                            </span>
                          </span>
                        </td>
                      </tr>
                      {group.units.map((u) => (
                        <tr key={u.unitId} className="group/row">
                          <td className="sticky left-0 z-10 border-b bg-card px-4 py-1.5 whitespace-nowrap group-hover/row:bg-muted/30">
                            <span className="font-medium">
                              #{u.serialNumber ?? u.unitId}
                            </span>
                            <span className="ml-2 text-muted-foreground/70">{u.condition}</span>
                          </td>
                          {days.map((d) => {
                            const weekend = isWeekend(d);
                            const isToday = isSameDay(d, today);
                            const hit = cellFor(u.unitId, d);
                            return (
                              <td
                                key={d.toISOString()}
                                className={cn(
                                  "border-b border-l p-1",
                                  weekend && "bg-muted/30",
                                  isToday && "bg-primary/[0.07]"
                                )}
                              >
                                {hit ? (
                                  <Link
                                    href={`/orders/${hit.orderId}`}
                                    title={`${STATUS_LABEL[hit.status] ?? hit.status} — ${format(
                                      hit.startDate,
                                      "dd MMM",
                                      { locale: localeId }
                                    )} s/d ${format(hit.endDate, "dd MMM", {
                                      locale: localeId,
                                    })}`}
                                    className={cn(
                                      "block h-6 rounded-md ring-1 transition-colors",
                                      STATUS_CELL[hit.status] ?? "bg-zinc-300 ring-zinc-400/30"
                                    )}
                                  />
                                ) : (
                                  <span className="block h-6 rounded-md bg-emerald-100/70 ring-1 ring-emerald-200/70" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
