import ExcelJS from "exceljs";
import { format } from "date-fns";
import { getReportMetrics } from "@/lib/reports";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = {
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const daysRaw = Number(url.searchParams.get("days"));
  const metrics = await getReportMetrics(daysRaw);
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet("Ringkasan");
  summary.columns = [
    { header: "Metrik", key: "label", width: 28 },
    { header: "Nilai", key: "value", width: 22 },
  ];
  summary.getCell("A1").font = { bold: true };
  summary.getCell("B1").font = { bold: true };
  const summaryRows: [string, number][] = [
    ["Rentang (hari)", metrics.days],
    ["Total Diterima", metrics.totalReceived],
    ["Nilai Order Dibuat", metrics.orderValue],
    ["Order Selesai", metrics.ordersCompleted],
    ["Order Terlambat", metrics.ordersLate],
    ["Pelanggan Baru", metrics.newCustomers],
  ];
  for (const [label, value] of summaryRows) {
    const row = summary.addRow({ label, value });
    if (label.includes("Diterima") || label.includes("Dibuat")) {
      row.getCell(2).numFmt = "#,##0";
    }
  }
  for (const t of metrics.topProducts) {
    summary.addRow({ label: `Top: ${t.productName}`, value: t.totalQty });
  }

  const ordersSheet = workbook.addWorksheet("Orders");
  ordersSheet.columns = [
    { header: "Nomor", key: "orderNumber", width: 20 },
    { header: "Tanggal", key: "createdAt", width: 14 },
    { header: "Pelanggan", key: "customerName", width: 20 },
    { header: "Item", key: "itemSummary", width: 40 },
    { header: "Total", key: "total", width: 14 },
    { header: "Dibayar", key: "paid", width: 14 },
    { header: "Sisa", key: "sisa", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  ordersSheet.getRow(1).font = { bold: true };
  for (const o of metrics.orders) {
    const row = ordersSheet.addRow({
      orderNumber: o.orderNumber,
      createdAt: format(new Date(o.createdAt), "dd/MM/yyyy"),
      customerName: o.customerName,
      itemSummary: o.itemSummary,
      total: o.total,
      paid: o.paid,
      sisa: o.sisa,
      status: STATUS_LABELS[o.status] ?? o.status,
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
      "Content-Disposition": `attachment; filename="laporan-${metrics.days}hari.xlsx"`,
    },
  });
}
