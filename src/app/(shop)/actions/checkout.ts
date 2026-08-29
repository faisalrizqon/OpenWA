"use server";

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureStockAvailable } from "@/lib/availability";
import { calcSubtotal, getTierPrice } from "@/lib/pricing";
import { generateOrderNumber } from "@/lib/orderNumber";
import { ensureCodReminders } from "@/lib/reminders/scheduler";
import { calcPromoDiscount, checkPromoEligibility } from "@/lib/promo";
import { saveUpload, resolveStoragePath } from "@/lib/storage";
import { createMidtransTransaction, midtransConfigured, type PaymentMethod } from "@/lib/payment";
import { requireMitraOrAdmin } from "@/lib/permissions";
import { compressImage } from "@/lib/image";

interface CheckoutItemInput {
  productId: number;
  quantity: number;
  durationHours: number;
}

const PHONE_RE = /^0\d{8,13}$/;

function parseCheckoutItems(raw: string): CheckoutItemInput[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const items = parsed as CheckoutItemInput[];
    const valid = items.every(
      (it) =>
        Number.isInteger(it.productId) &&
        it.productId > 0 &&
        Number.isInteger(it.quantity) &&
        it.quantity > 0 &&
        Number.isInteger(it.durationHours) &&
        it.durationHours > 0
    );
    return valid ? items : null;
  } catch {
    return null;
  }
}

/** Redirect kembali ke halaman checkout dengan pesan error, sambil
 *  mempertahankan konteks produk. TANPA productId di URL, halaman
 *  checkout langsung melempar user ke landing page ("/").
 *  `checkoutPage` membedakan jalur publik (/checkout) vs portal (/portal/checkout). */
function failCheckout(
  first: CheckoutItemInput,
  startDateRaw: string,
  msg: string,
  checkoutPage: string = "/checkout"
): never {
  const p = new URLSearchParams({
    productId: String(first.productId),
    quantity: String(first.quantity),
    durationHours: String(first.durationHours),
    error: msg,
  });
  if (startDateRaw) p.set("startDate", startDateRaw);
  redirect(`${checkoutPage}?${p.toString()}`);
}
/** Checkout customer dari katalog: buat Order (status booking, source online).
 *  `portal` = true untuk redirect ke /portal/orders/[orderNumber],
 *  false (default) untuk /order-status/[orderNumber]. */
export async function checkoutOrder(
  formData: FormData,
  { portal }: { portal?: boolean } = {}
) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const deliveryMode = String(formData.get("deliveryMode") ?? "pickup") === "courier" ? "courier" : "pickup";
  const methodRaw = String(formData.get("paymentMethod") ?? "cash").trim();
  const courierFee = Math.max(0, Number(formData.get("courierFee") ?? 0) || 0);
  const tip = Math.max(0, Number(formData.get("tip") ?? 0) || 0);
  const promoRaw = String(formData.get("promoCode") ?? "").trim().toUpperCase();

  const items = parseCheckoutItems(String(formData.get("items") ?? "[]"));
  const startDate = new Date(startDateRaw);
  const paymentMethod: PaymentMethod = ["cash", "qris", "midtrans"].includes(methodRaw)
    ? (methodRaw as PaymentMethod)
    : "cash";

  // URL kembali saat gagal — WAJIB pertahankan konteks produk (productId,
  // quantity, durasi, startDate). Tanpa productId halaman checkout langsung
  // redirect("/") ke landing page.
  if (!items) {
    redirect("/");
  }

  const first = items[0];
  const checkoutPage = portal ? "/portal/checkout" : "/checkout";

  if (isNaN(startDate.getTime()) || name.length < 2 || !PHONE_RE.test(phone)) {
    failCheckout(first, startDateRaw, "Data pesanan tidak lengkap atau tidak valid. Periksa kembali lalu coba lagi.", checkoutPage);
  }
  // Midtrans hanya boleh dipilih kalau memang dikonfigurasi
  if (paymentMethod === "midtrans" && !midtransConfigured()) {
    failCheckout(first, startDateRaw, "Pembayaran online belum tersedia. Pilih metode lain.", checkoutPage);
  }

  let orderId: string;
  let orderNumber: string;
  let total: number;

  try {
    ({ orderId, orderNumber, total } = await prisma.$transaction(async (tx) => {
      // 1) Upsert customer by phone (tolak blacklist)
      const customer = await tx.customer.upsert({
        where: { phone },
        update: {
          name,
          ...(email ? { email } : {}),
          ...(address ? { address } : {}),
        },
        create: { name, phone, ...(email ? { email } : {}), ...(address ? { address } : {}) },
      });
      if (customer.isBlacklisted) throw new Error("Mohon maaf, akun Anda tidak dapat melakukan pemesanan.");

      // 2) Kunci harga tier dari server + cek stok
      const maxDuration = Math.max(...items.map((it) => it.durationHours));
      const endDate = new Date(startDate.getTime() + maxDuration * 3600_000);
      const productIds = Array.from(new Set(items.map((it) => it.productId)));

      const pricedItems: (CheckoutItemInput & { unitPrice: number; name: string; sku: string })[] = [];
      for (const it of items) {
        const product = await tx.product.findUnique({ where: { id: it.productId } });
        if (!product || !product.active) throw new Error("Produk tidak tersedia");
        const unitPrice = getTierPrice(product, it.durationHours);
        if (unitPrice <= 0) throw new Error(`Harga belum diatur untuk ${product.name}`);
        pricedItems.push({ ...it, unitPrice, name: product.name, sku: product.sku });
      }

      for (const pid of productIds) {
        const needed = items.filter((it) => it.productId === pid).reduce((s, it) => s + it.quantity, 0);
        await ensureStockAvailable({
          client: tx,
          productId: pid,
          rangeStart: startDate,
          rangeEnd: endDate,
          needed,
        });
      }

      // Nomor order: ambil nomor terbesar yang sudah ada untuk tanggal lokal
      // ini (count-based numbering bisa duplikat bila ada order dihapus).
      const orderNumber = await generateOrderNumber(tx);

      // 4) Order + items
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: "pending",
          source: "online",
          paymentMethod,
          paymentStatus: "unpaid",
          startDate,
          endDate,
          noteOrder: note || null,
          deliveryMode,
          deliveryAddress: deliveryMode === "courier" ? address || null : null,
          courierFee,
          tipAmount: tip,
        },
      });

      let total = 0;
      for (const it of pricedItems) {
        const subtotal = calcSubtotal({ unitPrice: it.unitPrice, quantity: it.quantity });
        total += subtotal;
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: it.productId,
            quantity: it.quantity,
            durationHours: it.durationHours,
            unitPrice: it.unitPrice,
            subtotal,
          },
        });
      }

      // 5) Kode promo — validasi & terapkan potongan dari subtotal item
      let payable = total;
      if (promoRaw) {
        const promo = await tx.promoCode.findUnique({ where: { code: promoRaw } });
        if (!promo) throw new Error("Kode promo tidak ditemukan");
        const problem = checkPromoEligibility(promo, total);
        if (problem) throw new Error(problem);
        const promoDiscount = calcPromoDiscount(promo, total);
        await tx.order.update({
          where: { id: order.id },
          data: { promoCodeId: promo.id, promoDiscount },
        });
        await tx.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });
        payable = total - promoDiscount;
      }

      return { orderId: order.id, orderNumber, total: payable };
    }));
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal membuat pesanan";
    failCheckout(first, startDateRaw, msg, checkoutPage);
  }

  // Slot reminder COD disiapkan SETELAH transaksi commit (hindari nested-tx SQLite)
  await ensureCodReminders(orderId);

  // Midtrans: buat transaksi Snap lalu arahkan customer ke halaman pembayaran
  if (paymentMethod === "midtrans") {
    try {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
        include: { product: { select: { name: true, sku: true } } },
      });
      const { token } = await createMidtransTransaction({
        orderId: orderNumber,
        grossAmount: total,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
        itemDetails: orderItems.map((it) => ({
          id: it.product.sku,
          price: it.unitPrice,
          quantity: it.quantity,
          name: `${it.product.name} (${it.durationHours} jam)`,
        })),
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentRef: token, paymentStatus: "pending" },
      });
    } catch (e) {
      // Gateway gagal -> order tetap dibuat, arahkan ke halaman pembayaran
      // (admin bisa follow-up); jangan gagalkan checkout.
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    }
    redirect(`${portal ? "/portal/orders" : "/order-status"}/${orderNumber}`);
  }

  redirect(`${portal ? "/portal/orders" : "/order-status"}/${orderNumber}`);
}

/** Checkout jalur portal customer — sama dengan checkoutOrder tetapi semua
 *  redirect (sukses & error) tetap di jalur /portal/* supaya customer tidak
 *  terlempar ke halaman publik tanpa login. */
export async function checkoutOrderPortal(formData: FormData) {
  return checkoutOrder(formData, { portal: true });
}

/** Customer mengubah metode pembayaran sebelum lunas.
 *  Syarat: order online, masih booking, belum ada pembayaran terkonfirmasi.
 *  Bukti bayar lama (pending) ditandai gagal supaya tidak dihitung. */
export async function changePaymentMethod(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  // Halaman kembali bisa di-override via hidden input `back` (mis. dari order-status)
  const backParam = String(formData.get("back") ?? "").trim();
  const back = backParam.startsWith("/") ? backParam : `/order-status/${orderNumber}`;
  if (!orderNumber) redirect(back);

  const method = String(formData.get("method") ?? "").trim();
  const validMethods = ["cash", "qris", "midtrans", "transfer"];
  if (!validMethods.includes(method) || (method === "midtrans" && !midtransConfigured())) {
    redirect(`${back}?error=method`);
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { payments: { orderBy: { paidAt: "asc" } } },
  });
  if (!order) redirect(back);

  // Hanya boleh sebelum lunas & belum ada pembayaran terkonfirmasi
  const hasConfirmed = order.payments.some((p) => p.status === "confirmed");
  if (order.paymentStatus === "paid" || hasConfirmed) {
    redirect(`${back}?error=locked`);
  }
  // Order harus masih pending/booking — setelah aktif, pembayaran diurus admin
  if (order.status !== "booking" && order.status !== "pending") {
    redirect(`${back}?error=locked`);
  }
  if (order.paymentMethod === method) redirect(back);

  const updates = [];
  // Tandai bukti pembayaran lama yang masih pending sebagai gagal
  for (const p of order.payments) {
    if (p.status === "pending") {
      updates.push(
        prisma.payment.update({
          where: { id: p.id },
          data: { status: "failed", note: "Metode pembayaran diubah oleh customer" },
        })
      );
    }
  }
  updates.push(
    prisma.order.update({
      where: { id: order.id },
      data: { paymentMethod: method, paymentStatus: "unpaid" },
    })
  );

  await prisma.$transaction(updates);

  revalidatePath(`/order-status/${orderNumber}`);
  revalidatePath("/admin/orders");
  redirect(`${back}?method=changed`);
}

const PROOF_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Customer upload bukti transfer/QRIS statis. */
export async function submitPaymentProof(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  const defaultBack = `/order-status/${orderNumber}`;
  if (!orderNumber) redirect(defaultBack);

  // Halaman kembali bisa di-override via hidden input `back` (mis. dari portal).
  const backParam = String(formData.get("back") ?? "").trim();
  const back = backParam.startsWith("/") ? backParam : defaultBack;

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  // Accept any file type - auto-compress by our engine
  if (file.size > 5 * 1024 * 1024) redirect(`${back}?error=file-size-exceeded`);

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { payments: { orderBy: { paidAt: "asc" } } },
  });
  if (!order) redirect(back);

  // Hitung total order untuk jumlah pada record pembayaran
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const total = items.reduce((s, it) => s + it.subtotal, 0);

  // File > 3 MB dikompresi otomatis; ≤ 3 MB disimpan apa adanya.
  const image = await compressImage(Buffer.from(await file.arrayBuffer()), file.type);
  const fileName = `${order.orderNumber}-${Date.now()}.${image.ext}`;
  const stored = await saveUpload("proof", fileName, image.buffer);

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        paymentType: "pelunasan",
        method: order.paymentMethod ?? "qris",
        status: "pending",
        proofPath: stored.filePath,
        note: "Bukti bayar dari customer (menunggu verifikasi)",
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "pending" },
    }),
  ]);

    revalidatePath(`/order-status/${orderNumber}`);
  revalidatePath(`/admin/orders`);
  revalidatePath(back);
  redirect(`${back}?proof=uploaded`);
}

/** Admin: konfirmasi pembayaran online yang masih pending (bukti QRIS / Midtrans manual). */
export async function confirmOnlinePayment(formData: FormData) {
  const _user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const back = `/admin/orders/${orderId}`;
  if (!orderId) redirect(back);

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { orderId, status: "pending" },
      data: { status: "confirmed", note: "Dikonfirmasi admin" },
    }),
    prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "paid" } }),
  ]);

  revalidatePath(back);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect(back);
}

const GUARANTEE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Customer/admin upload dokumen jaminan untuk order tertentu.
 *  Form mengirim 2 file sekaligus:
 *  - `file`   : foto identitas sesuai pilihan (KTP / kartu pelajar)
 *  - `selfie` : foto selfie identitas (WAJIB)
 *  Keduanya disimpan sebagai dokumen terpisah. */
export async function submitGuarantee(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const docType = String(formData.get("docType") ?? "ktp");
  const file = formData.get("file");
  const selfie = formData.get("selfie");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) redirect("/");
  // Halaman kembali: default order-status customer; admin bisa kirim `back`
  // (mis. /admin/orders/<id>) agar kembali ke halaman detail order.
  const backParam = String(formData.get("back") ?? "");
  const back = backParam.startsWith("/") ? backParam : `/order-status/${order.orderNumber}`;

  if (!["ktp", "kartu_pelajar"].includes(docType)) redirect(`${back}?error=invalid`);
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  if (!(selfie instanceof File) || selfie.size === 0) redirect(`${back}?error=nofile`);

  const dir = path.join(process.cwd(), "public", "uploads", "guarantee");
  await mkdir(dir, { recursive: true });

  const entries: Array<{ type: string; f: File }> = [
    { type: docType, f: file },
    { type: "selfie_ktp", f: selfie },
  ];

  for (const entry of entries) {
    const ext = GUARANTEE_MIME_EXT[entry.f.type];
    if (!ext || entry.f.size > 5 * 1024 * 1024) redirect(`${back}?error=file`);
    // File > 3 MB dikompres otomatis; ≤ 3 MB disimpan apa adanya.
    const image = await compressImage(Buffer.from(await entry.f.arrayBuffer()), entry.f.type);
    const fileName = `${order.orderNumber}-${entry.type}-${Date.now()}.${image.ext}`;
    await writeFile(path.join(dir, fileName), image.buffer);
    await prisma.document.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        docType: entry.type,
        filePath: `/uploads/guarantee/${fileName}`,
      },
    });
  }

  revalidatePath(back);
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`${back}?guarantee=uploaded`);
}

/** Hapus dokumen jaminan yang sudah terupload (revisi bila salah upload).
 * Dipakai dari halaman order-status customer & detail order admin.
 * Jaminan bersifat opsional (pelengkap data), jadi dokumen boleh dihapus. */
export async function deleteGuarantee(formData: FormData) {
  const documentId = Number(formData.get("documentId"));
  const orderId = String(formData.get("orderId") ?? "");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) redirect("/");

  const backParam = String(formData.get("back") ?? "");
  const back = backParam.startsWith("/") ? backParam : `/order-status/${order.orderNumber}`;

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.orderId !== orderId) redirect(`${back}?error=invalid`);

  // Hapus file fisik: dukung path legacy /uploads/... dan storage baru /storage/...
  if (doc.filePath.startsWith("/storage/")) {
    const fullPath = resolveStoragePath(doc.filePath);
    if (fullPath) await unlink(fullPath).catch(() => {});
  } else if (doc.filePath.startsWith("/uploads/")) {
    const relative = doc.filePath.slice("/uploads/".length);
    if (!relative.includes("..")) {
      await unlink(path.join(process.cwd(), "public", "uploads", relative)).catch(() => {});
    }
  }

  await prisma.document.delete({ where: { id: doc.id } });

  revalidatePath(back);
  revalidatePath(`/order-status/${order.orderNumber}`);
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`${back}?guarantee=deleted`);
}

/** Admin/mitra simpan link Google Drive berisi foto hasil sewa.
 *  Tidak redirect — mengembalikan hasil agar form tetap di halaman yang sama.
 *  Kirim string kosong untuk menghapus link. */
export async function savePhotoLink(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const photoLink = String(formData.get("photoLink") ?? "").trim();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
  });
  if (!order) return { ok: false, error: "Order tidak ditemukan." };

  if (photoLink) {
    try {
      const url = new URL(photoLink);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
    } catch {
      return { ok: false, error: "Link tidak valid — masukkan URL Google Drive lengkap (diawali http/https)." };
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { photoLink: photoLink || null },
  });

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath(`/order-status/${order.orderNumber}`);
  revalidatePath(`/portal/orders/${order.orderNumber}`);
  return { ok: true };
}
export async function completeOrder(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const method = String(formData.get("paymentMethod") ?? "").trim();
  const backParam = String(formData.get("back") ?? "");
  const proofFileRaw = formData.get("proof");

  // Validasi order exists & get current state
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { documents: true, payments: true, items: true },
  });
  if (!order) redirect(`/order-status/${orderId}?error=not-found`);

  // Anti double-submit: order yang sudah ditandai lengkap tidak boleh di-submit ulang
  // (mencegah duplikasi record pembayaran).
  const alreadyComplete = order.paymentCompleted || order.payments.some((p) => p.status === "confirmed");

  // Default return URL to this order's status page
  const back = backParam.startsWith("/") ? backParam : `/order-status/${order.orderNumber}`;

  // Validasi: method harus valid
  const validMethods = ["cash", "qris", "transfer", "gopay", "midtrans"];
  if (!validMethods.includes(method)) {
    redirect(`${back}?error=invalid-method`);
  }

  // Validasi: midtrans hanya jika dikonfigurasi
  if (method === "midtrans" && !midtransConfigured()) {
    redirect(`${back}?error=midtrans-not-configured`);
  }

  // Validasi: gopay hanya jika gateway tersinkron & metode diaktifkan admin
  if (method === "gopay") {
    const shop = await prisma.storeContent.findUnique({ where: { id: 1 }, select: { gopayEnabled: true } });
    if (!shop?.gopayEnabled) {
      redirect(`${back}?error=gopay-not-available`);
    }
  }

  // Hitung total untuk record pembayaran
  const total = order.items.reduce((s, it) => s + it.subtotal, 0) + order.courierFee + order.tipAmount;

  // Cek validasi per metode (kecuali sudah lengkap — idempotent no-op).
  // Bukti QRIS/transfer kini disimpan terpisah via submitPaymentProof ("Simpan Bukti"),
  // jadi finalisasi cukup cek bukti yang sudah tersimpan (atau file yang masih dilampirkan).
  const savedProof = order.payments.find((p) => p.status === "pending" && p.proofPath);
  if (!alreadyComplete) {
    if (method === "cash") {
      // Jaminan wajib LENGKAP: foto identitas (KTP / kartu pelajar) DAN foto selfie.
      const hasIdentityDoc = order.documents.some((d) => ["ktp", "kartu_pelajar"].includes(d.docType));
      const hasSelfieDoc = order.documents.some((d) => d.docType === "selfie_ktp");
      if (!hasIdentityDoc || !hasSelfieDoc) {
        redirect(`${back}?error=missing-guarantee`);
      }
    }
    if (
      (method === "qris" || method === "transfer") &&
      !savedProof &&
      (!(proofFileRaw instanceof File) || proofFileRaw.size === 0)
    ) {
      redirect(`${back}?error=missing-proof`);
    }
  }

  // Process file upload jika ada (qris/transfer)
  let paymentProofPath: string | null = null;
  if (!alreadyComplete && method !== "cash" && proofFileRaw instanceof File && proofFileRaw.size > 0) {
    const MAX_PROOF_SIZE = 5 * 1024 * 1024;
    if (proofFileRaw.size > MAX_PROOF_SIZE) redirect(`${back}?error=file-size-exceeded`);
    
    // Accept any file type - auto-compress by our engine
    const image = await compressImage(Buffer.from(await proofFileRaw.arrayBuffer()), proofFileRaw.type);
    const fileName = `${order.orderNumber}-${Date.now()}.${image.ext}`;
    const stored = await saveUpload("proof", fileName, image.buffer);
    paymentProofPath = stored.filePath;
  }

  // Transaction: buat payment record + update order flags.
  // Bila sudah lengkap: cukup pastikan flags konsisten (idempotent), tanpa buat payment baru.
  if (alreadyComplete) {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentCompleted: true },
    });
  } else {
    // Midtrans & gopay tidak membuat payment record di sini — gateway/polling
    // yang mencatatnya (midtrans: webhook notify; gopay: reconcile mutasi GoPay Merchant).
    const gatewayMethod = method === "midtrans" || method === "gopay";
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          paymentCompleted: true,
          paymentCompleteAt: new Date(),
          paymentMethod: method,
          ...(!gatewayMethod ? { paymentStatus: "pending" } : {}),
        },
      }),
      ...(gatewayMethod || savedProof
        ? [] // bukti sudah tersimpan via submitPaymentProof — jangan buat record duplikat
        : [
            prisma.payment.create({
              data: {
                orderId,
                amount: total,
                paymentType: "pelunasan",
                method,
                status: "pending",
                proofPath: paymentProofPath,
                note: "Unified payment submission (menunggu verifikasi admin)",
              },
            }),
          ]),
    ]);
  }

  revalidatePath(back);
  revalidatePath("/admin/orders");
  redirect(`${back}?success=completed`);
}
