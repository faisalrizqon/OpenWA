import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** Item order lengkap dengan aturan denda produknya. */
export interface LateFeeItem {
  productId: number;
  quantity: number;
  feePerDay: number | null; // null = produk tanpa aturan denda
  graceHours: number;
}

export interface LateInfo {
  lateDays: number; // hari keterlambatan (> 0 hanya bila melewati masa tenggang)
  suggestedFine: number; // total denda yang disarankan (Rp)
  hasFeeRules: boolean;
}

/** Hitung keterlambatan + saran denda untuk satu order.
 *  `reference` = waktu acuan (biasanya returnedAt ?? sekarang). */
export function computeLateInfo(
  endDate: Date,
  items: LateFeeItem[],
  reference: Date
): LateInfo {
  let suggestedFine = 0;
  let maxDays = 0;
  const hasFeeRules = items.some((it) => it.feePerDay != null && it.feePerDay > 0);

  for (const it of items) {
    if (it.feePerDay == null || it.feePerDay <= 0) continue;
    const deadline = endDate.getTime() + it.graceHours * HOUR_MS;
    const overdueMs = reference.getTime() - deadline;
    if (overdueMs <= 0) continue;
    const days = Math.ceil(overdueMs / DAY_MS);
    maxDays = Math.max(maxDays, days);
    suggestedFine += days * it.feePerDay * it.quantity;
  }

  return { lateDays: maxDays, suggestedFine: Math.round(suggestedFine), hasFeeRules };
}

/** Muat aturan denda untuk item-item sebuah order. */
export async function loadLateFeeItems(
  orderId: string
): Promise<LateFeeItem[]> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: {
      productId: true,
      quantity: true,
      product: { select: { lateFee: { select: { feePerDay: true, graceHours: true, active: true } } } },
    },
  });
  return items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity,
    feePerDay: it.product.lateFee?.active ? it.product.lateFee.feePerDay : null,
    graceHours: it.product.lateFee?.graceHours ?? 0,
  }));
}

// --- Auto-transisi active → late (throttled, dipanggil dari layout admin) ---
let lastSync = 0;
const SYNC_INTERVAL_MS = 60_000;

/** Tandai order aktif yang sudah lewat endDate menjadi "late".
 *  Dipanggil throttled dari layout admin agar tidak membebani tiap render. */
export async function syncLateOrders(): Promise<void> {
  const now = Date.now();
  if (now - lastSync < SYNC_INTERVAL_MS) return;
  lastSync = now;

  try {
    const overdue = await prisma.order.findMany({
      where: { status: "active", endDate: { lt: new Date() } },
      select: { id: true, endDate: true },
    });
    for (const o of overdue) {
      await prisma.order.update({ where: { id: o.id }, data: { status: "late" } });
      await logAudit(prisma, {
        entityType: "order",
        entityId: o.id,
        action: "status_change",
        summary: `Status otomatis active → late (lewat ${o.endDate.toLocaleString("id-ID")})`,
        userId: null,
      });
    }
  } catch (e) {
    console.warn("[late-sync] gagal:", e);
  }
}
