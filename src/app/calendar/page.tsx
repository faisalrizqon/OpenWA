import Link from "next/link";
import { addDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { rangesOverlap } from "@/lib/availability";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = 30;

const STATUS_CELL: Record<string, string> = {
  booking: "bg-yellow-200",
  active: "bg-red-300",
  late: "bg-red-300",
};

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

  // Flat list of order items that have a unit assigned
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
      label: `${p.name}${u.serialNumber ? ` #${u.serialNumber}` : ""} (${u.condition})`,
    }))
  );

  return (
    <div className="p-4 space-y-6 md:p-6">
      <h1 className="text-2xl font-bold">Kalender Ketersediaan</h1>

      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-green-100 border border-green-200" />
          Tersedia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-yellow-200 border border-yellow-300" />
          Booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-red-300 border border-red-400" />
          Aktif / Terlambat
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>30 Hari ke Depan</CardTitle>
          <CardDescription>Satu baris per unit fisik — klik cell untuk buka order</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              <p>Belum ada unit produk aktif.</p>
              <Link
                href="/products/new"
                className="mt-2 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Tambah produk dulu
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-max border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium">
                      Unit
                    </th>
                    {days.map((d) => {
                      const weekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <th
                          key={d.toISOString()}
                          className={`px-1 py-1 text-center font-normal ${
                            weekend ? "text-zinc-400" : "text-zinc-600"
                          }`}
                        >
                          <div>{format(d, "d", { locale: localeId })}</div>
                          <div>{format(d, "MMM", { locale: localeId })}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.unitId}>
                      <td className="sticky left-0 z-10 bg-card px-2 py-1 whitespace-nowrap text-zinc-700">
                        {row.label}
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
                                title={`Order ${hit.status}`}
                                className={`block h-6 w-6 rounded-sm border border-black/10 ${
                                  STATUS_CELL[hit.status] ?? "bg-zinc-200"
                                }`}
                              />
                            </td>
                          );
                        }
                        return (
                          <td key={d.toISOString()} className="p-0.5">
                            <span className="block h-6 w-6 rounded-sm border border-green-200 bg-green-100" />
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
