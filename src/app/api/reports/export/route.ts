import ExcelJS from "exceljs";
import { format } from "date-fns";
import { getReportMetrics, resolveReportRange, MAX_REPORT_DAYS } from "@/lib/reports";
import { requireAdmin } from "@/lib/permissions";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  gopay: "GoPay",
  midtrans: "Midtrans",
};

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const fmt = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const daysRaw = Number(url.searchParams.get("days"));
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  // Validasi rentang dulu agar pesan error jelas sebelum query berat dijalankan.
  try {
    resolveReportRange({
      days: Number.isFinite(daysRaw) ? daysRaw : undefined,
      from: fromRaw,
      to: toRaw,
    });
  } catch (err) {
    const message =
      err instanceof RangeError
        ? err.message
        : `Rentang laporan tidak valid (maksimal ${MAX_REPORT_DAYS} hari).`;
    return new Response(message, { status: 400 });
  }

  const metrics = await getReportMetrics({
    days: Number.isFinite(daysRaw) ? daysRaw : undefined,
    from: fromRaw,
    to: toRaw,
  });

  const rangeLabel = format(metrics.rangeStart, "dd/MM/yyyy");
  const rangeEndLabel = format(metrics.rangeEnd, "dd/MM/yyyy");
  const fileLabel = `${format(metrics.rangeStart, "yyyy-MM-dd")}_sdt_${format(metrics.rangeEnd, "yyyy-MM-dd")}`;

  // --- Mode CSV: satu file pipih (ringkasan + orders), tanpa dependensi Excel ---
  if (fmt === "csv") {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    lines.push("JENIS,KOLOM1,KOLOM2");
    lines.push(`Metrik,Rentang,${rangeLabel} - ${rangeEndLabel}`);
    lines.push(`Metrik,Jumlah Hari,${metrics.days}`);
    lines.push(`Metrik,Total Diterima,${metrics.totalReceived}`);
    lines.push(`Metrik,Nilai Order Dibuat,${metrics.orderValue}`);
    lines.push(`Metrik,Order Selesai,${metrics.ordersCompleted}`);
    lines.push(`Metrik,Order Terlambat,${metrics.ordersLate}`);
    lines.push(`Metrik,Pelanggan Baru,${metrics.newCustomers}`);
    for (const t of metrics.topProducts) {
      lines.push(`Produk Terlaris,${esc(t.productName)},${t.totalQty}`);
      lines.push(`Pendapatan Produk,${esc(t.productName)},${t.totalRevenue}`);
    }
    for (const u of metrics.utilization) {
      lines.push(`Utilisasi,${esc(u.productName)},${u.pct}% (${u.usedUnitDays}/${u.capacityUnitDays} hari-unit)`);
    }
    lines.push("");
    lines.push("ORDER,Nomor,Tanggal,Periode Sewa,Pelanggan,Item,Total,Dibayar,Sisa,Status,Metode Bayar");
    for (const o of metrics.orders) {
      lines.push(
        [
          "Order",
          o.orderNumber,
          format(new Date(o.createdAt), "dd/MM/yyyy"),
          `${format(new Date(o.startDate), "dd/MM/yyyy")} - ${format(new Date(o.endDate), "dd/MM/yyyy")}`,
          esc(o.customerName),
          esc(o.itemSummary),
          o.total,
          o.paid,
          o.sisa,
          STATUS_LABELS[o.status] ?? o.status,
          esc(PAYMENT_METHOD_LABELS[o.paymentMethod ?? ""] ?? o.paymentMethod ?? "-"),
        ].join(",")
      );
    }
    const csv = "\uFEFF" + lines.join("\n"); // BOM agar Excel membaca UTF-8
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-${fileLabel}.csv"`,
      },
    });
  }

  // --- Mode Excel (xlsx) ---
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet("Ringkasan");
  summary.columns = [
    { header: "Metrik", key: "label", width: 28 },
    { header: "Nilai", key: "value", width: 30 },
  ];
  summary.getCell("A1").font = { bold: true };
  summary.getCell("B1").font = { bold: true };
  const summaryRows: [string, number | string][] = [
    ["Rentang", `${rangeLabel} - ${rangeEndLabel}`],
    ["Jumlah Hari", metrics.days],
    ["Total Diterima", metrics.totalReceived],
    ["Nilai Order Dibuat", metrics.orderValue],
    ["Order Selesai", metrics.ordersCompleted],
    ["Order Terlambat", metrics.ordersLate],
    ["Pelanggan Baru", metrics.newCustomers],
  ];
  for (const [label, value] of summaryRows) {
    const row = summary.addRow({ label, value });
    if (typeof value === "number" && (label.includes("Diterima") || label.includes("Dibuat"))) {
      row.getCell(2).numFmt = "#,##0";
    }
  }
  for (const t of metrics.topProducts) {
    summary.addRow({ label: `Top: ${t.productName}`, value: `${t.totalQty} unit · Rp ${t.totalRevenue.toLocaleString("id-ID")}` });
  }
  for (const u of metrics.utilization) {
    summary.addRow({ label: `Utilisasi: ${u.productName}`, value: `${u.pct}% (${u.usedUnitDays}/${u.capacityUnitDays})` });
  }

  const ordersSheet = workbook.addWorksheet("Orders");
  ordersSheet.columns = [
    { header: "Nomor", key: "orderNumber", width: 20 },
    { header: "Tanggal", key: "createdAt", width: 14 },
    { header: "Periode Sewa", key: "rentalPeriod", width: 24 },
    { header: "Pelanggan", key: "customerName", width: 20 },
    { header: "Item", key: "itemSummary", width: 40 },
    { header: "Total", key: "total", width: 14 },
    { header: "Dibayar", key: "paid", width: 14 },
    { header: "Sisa", key: "sisa", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Metode Bayar", key: "paymentMethod", width: 14 },
  ];
  ordersSheet.getRow(1).font = { bold: true };
  for (const o of metrics.orders) {
    const row = ordersSheet.addRow({
      orderNumber: o.orderNumber,
      createdAt: format(new Date(o.createdAt), "dd/MM/yyyy"),
      rentalPeriod: `${format(new Date(o.startDate), "dd/MM/yyyy")} - ${format(new Date(o.endDate), "dd/MM/yyyy")}`,
      customerName: o.customerName,
      itemSummary: o.itemSummary,
      total: o.total,
      paid: o.paid,
      sisa: o.sisa,
      status: STATUS_LABELS[o.status] ?? o.status,
      paymentMethod: PAYMENT_METHOD_LABELS[o.paymentMethod ?? ""] ?? o.paymentMethod ?? "-",
    });
    row.getCell("total").numFmt = "#,##0";
    row.getCell("paid").numFmt = "#,##0";
    row.getCell("sisa").numFmt = "#,##0";
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-${fileLabel}.xlsx"`,
    },
  });
}
