import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Eye,
  QrCode,
  Save,
  Settings2,
  Upload,
  ZoomIn,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getStoreSettings } from "@/lib/content";
import { formatRupiah } from "@/lib/pricing";
import { storageUrl } from "@/lib/storage";
import { approvePayment, updatePaymentSettings } from "@/actions/payments";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod } from "@/lib/payment";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RejectPaymentForm } from "./RejectPaymentForm";
import { GoPayAdminCard } from "@/components/GoPayAdminCard";
import { isGopayGatewayRunning } from "@/actions/gopay-gateway";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


export const dynamic = "force-dynamic";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  dp: "DP",
  pelunasan: "Pelunasan",
  denda: "Denda",
};

const TAB_IDS = ["history", "config"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  history: "Konfirmasi & Histori",
  config: "Konfigurasi Metode",
};

function PaymentTabs({ active, pendingCount }: { active: TabId; pendingCount: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAB_IDS.map((id) => (
        <Link
          key={id}
          href={`/admin/payments?tab=${id}`}
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
            active === id
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {id === "history" ? (
            <ClipboardList className="size-4" aria-hidden />
          ) : (
            <Settings2 className="size-4" aria-hidden />
          )}
          {TAB_LABELS[id]}
          {id === "history" && pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/** Panel Pembayaran: 2 tab — antrian verifikasi + histori, dan konfigurasi metode. */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "mitra")) {
    redirect("/login");
  }

  const sp = await searchParams;
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: TabId = TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : "history";

  const notifications: PageNotification[] = [];
  if (sp.approved === "1") {
    notifications.push({ type: "success", message: "Pembayaran berhasil dikonfirmasi!" });
  } else if (sp.rejected === "1") {
    notifications.push({ type: "info", message: "Pembayaran ditolak. Customer bisa upload bukti baru." });
  } else if (sp.saved === "1") {
    notifications.push({ type: "success", message: "Konfigurasi pembayaran berhasil disimpan." });
  } else if (sp.error) {
    const errKey = Array.isArray(sp.error) ? sp.error[0] : sp.error;
    const errMessages: Record<string, string> = {
      "qris-format": "Format QRIS harus PNG.",
      "qris-size": "Ukuran gambar QRIS maksimal 5 MB.",
      invalid: "Data konfigurasi tidak valid.",
      none: "Minimal satu metode pembayaran harus aktif.",
    };
    notifications.push({ type: "error", message: errMessages[errKey ?? ""] ?? "Terjadi kesalahan." });
  }

  // Notifikasi hasil kontrol gateway (tombol Mulai/Stop di kartu GoPay)
  const gwResult = Array.isArray(sp.gw) ? sp.gw[0] : sp.gw;
  const gwMessages: Record<string, PageNotification> = {
    started: { type: "success", message: "Gateway GoPay berhasil dijalankan. Klik 'Sinkronkan Status' setelah login OTP." },
    "already-running": { type: "info", message: "Gateway GoPay sudah berjalan." },
    "start-failed": { type: "error", message: "Gateway GoPay gagal start — cek file gopay-gateway.log." },
    "no-env": { type: "error", message: "File gopay-gateway/.env belum ada — buat dulu (PORT, API_KEY)." },
    stopped: { type: "info", message: "Gateway GoPay dihentikan." },
    "already-stopped": { type: "info", message: "Gateway GoPay memang belum berjalan." },
    "stop-failed": { type: "error", message: "Gagal menghentikan gateway — coba lagi atau kill manual." },
  };
  if (gwResult && gwMessages[gwResult]) {
    notifications.push(gwMessages[gwResult]);
  }

  // Status proses gateway untuk kartu GoPay
  const gatewayRunning = await isGopayGatewayRunning();
  let gatewayPort = 3100;
  try {
    gatewayPort = Number(new URL(process.env.GOPAY_GATEWAY_URL || "http://localhost:3100").port) || 3100;
  } catch {
    gatewayPort = 3100;
  }

  const settings = await getStoreSettings();

  // Get GoPay session status for admin card
  let goPayStatus: { loggedIn: boolean; merchantName: string | null; lastLoginAt: string | null } = {
    loggedIn: false,
    merchantName: null,
    lastLoginAt: null,
  };
  const gopaySession = await prisma.gopaySession.findUnique({ where: { id: 1 } });
  if (gopaySession?.sessionJson.includes("gopay-api-gateaway")) {
    goPayStatus = {
      loggedIn: true,
      merchantName: gopaySession.merchantName ?? null,
      lastLoginAt: gopaySession.lastLoginAt ? format(gopaySession.lastLoginAt, "dd MMM yyyy, HH:mm", { locale: localeId }) : null,
    };
  }

  const [pendingPayments, confirmedPayments] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "pending" },
      include: { order: { include: { customer: true, items: { include: { product: true } } } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { status: "confirmed" },
      include: { order: { include: { customer: true } } },
      orderBy: { paidAt: "desc" },
      take: 50,
    }),
  ]);

  // ─── TAB: History (Pending + Confirmed) ───────────────────────────
  if (tab === "history") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Konfirmasi & Histori Pembayaran"
          description={`${pendingPayments.length} menunggu verifikasi · ${confirmedPayments.length} terkonfirmasi`}
        />
        <PageNotifier notifications={notifications} />
        <PaymentTabs active={tab} pendingCount={pendingPayments.length} />

        {/* ── Pending Payments ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-4 text-amber-500" aria-hidden />
              Menunggu Verifikasi
            </CardTitle>
            <CardDescription>
              Bukti transfer / QRIS yang diupload customer dan perlu dikonfirmasi admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tidak ada pembayaran yang menunggu verifikasi. 🎉
              </p>
            ) : (
              <ul className="space-y-4">
                {pendingPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders/${payment.orderId}`}
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            {payment.order?.orderNumber ?? payment.orderId}
                          </Link>
                          <span className={payment.paymentType === "pelunasan" ? "rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white" : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}>
                            {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                          </span>
                          {payment.method && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {PAYMENT_METHOD_LABELS[(payment.method as PaymentMethod)] ?? payment.method}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payment.order?.customer?.name ?? "Customer"} ·{" "}
                          {format(new Date(payment.paidAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
                        </p>
                        <p className="text-lg font-bold tabular-nums">{formatRupiah(payment.amount)}</p>
                        {payment.note && (
                          <p className="text-xs italic text-muted-foreground">"{payment.note}"</p>
                        )}
                        {/* Items summary */}
                        {payment.order?.items && payment.order.items.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Item: {payment.order.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", ")}
                          </p>
                        )}
                      </div>

                      {/* Right: Proof + Actions */}
                      <div className="flex flex-col items-end gap-2">
                        {payment.proofPath && (
                          <>
                            <Dialog>
                              <DialogTrigger className="group relative block cursor-pointer overflow-hidden rounded-lg border bg-muted transition-transform hover:scale-[1.02]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={storageUrl(payment.proofPath)}
                                  alt="Bukti pembayaran — klik untuk lihat ukuran penuh"
                                  className="h-48 w-auto object-cover"
                                />
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                  <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow">
                                    <ZoomIn className="size-4" aria-hidden />
                                    Lihat Bukti Pembayaran
                                  </span>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-5xl sm:max-w-5xl">
                                <DialogHeader>
                                  <DialogTitle>Bukti Pembayaran — {payment.order?.orderNumber ?? payment.orderId}</DialogTitle>
                                </DialogHeader>
                                <div className="flex items-center justify-center bg-muted p-4">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={storageUrl(payment.proofPath)}
                                    alt="Bukti pembayaran ukuran penuh"
                                    className="max-h-[75vh] max-w-full object-contain"
                                  />
                                </div>
                                <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
                                  Tekan ESC atau tombol tutup untuk menutup
                                </p>
                              </DialogContent>
                            </Dialog>
                            <p className="text-xs text-muted-foreground">
                              Klik gambar untuk lihat bukti pembayaran
                            </p>
                          </>
                        )}
                        <div className="flex gap-2">
                          <form action={approvePayment}>
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <Button type="submit" size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
                              <CheckCircle2 className="size-4" aria-hidden />
                              Konfirmasi Pembayaran
                            </Button>
                          </form>
                          <RejectPaymentForm paymentId={payment.id} />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Confirmed Payments History ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
              Riwayat Pembayaran Terkonfirmasi
            </CardTitle>
            <CardDescription>50 pembayaran terakhir yang sudah diverifikasi.</CardDescription>
          </CardHeader>
          <CardContent>
            {confirmedPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada pembayaran yang terkonfirmasi.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-2.5">Order</th>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Jenis</th>
                      <th className="px-4 py-2.5">Metode</th>
                      <th className="px-4 py-2.5">Bukti</th>
                      <th className="px-4 py-2.5 text-right">Jumlah</th>
                      <th className="px-4 py-2.5">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {confirmedPayments.map((payment) => (
                      <tr key={payment.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/admin/orders/${payment.orderId}`}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {payment.order?.orderNumber ?? payment.orderId}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {payment.order?.customer?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={payment.paymentType === "pelunasan" ? "rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white" : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium"}>
                            {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {payment.method
                            ? PAYMENT_METHOD_LABELS[(payment.method as PaymentMethod)] ?? payment.method
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {payment.proofPath ? (
                            <Dialog>
                              <DialogTrigger
                                className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                                title="Lihat bukti pembayaran"
                                aria-label={`Lihat bukti pembayaran ${payment.order?.orderNumber ?? payment.orderId}`}
                              >
                                <Eye className="size-4" aria-hidden />
                              </DialogTrigger>
                              <DialogContent className="max-w-5xl sm:max-w-5xl">
                                <DialogHeader>
                                  <DialogTitle>Bukti Pembayaran — {payment.order?.orderNumber ?? payment.orderId}</DialogTitle>
                                </DialogHeader>
                                <div className="flex items-center justify-center bg-muted p-4">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={storageUrl(payment.proofPath)}
                                    alt="Bukti pembayaran ukuran penuh"
                                    className="max-h-[75vh] max-w-full object-contain"
                                  />
                                </div>
                                <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
                                  Tekan ESC atau tombol tutup untuk menutup
                                </p>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                          {formatRupiah(payment.amount)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                          {format(new Date(payment.paidAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
                        </td>
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

  // ─── TAB: Config ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi Metode Pembayaran"
        description="Atur metode pembayaran yang tersedia untuk pelanggan di checkout."
      />
      <PageNotifier notifications={notifications} />
      <PaymentTabs active={tab} pendingCount={pendingPayments.length} />

      {/* ── GoPay Merchant (login GoPay Merchant + status sesi) ── */}
      <GoPayAdminCard
        loggedIn={goPayStatus.loggedIn}
        merchantName={goPayStatus.merchantName}
        lastLoginAt={goPayStatus.lastLoginAt}
        gatewayRunning={gatewayRunning}
        gatewayPort={gatewayPort}
      />
      <form action={updatePaymentSettings}>
        <input type="hidden" name="qrisImagePath" value={settings.qrisImagePath} />

        <div className="space-y-4">
          {/* ── Cash ── */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Banknote className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">Cash / Bayar di Tempat</p>
                  <p className="text-sm text-muted-foreground">
                    Customer bayar tunai saat pengambilan/pengantaran.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  name="cashEnabled"
                  defaultChecked={settings.cashEnabled === "true"}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-emerald-500 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </CardContent>
          </Card>

          {/* ── QRIS ── */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <QrCode className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium">QRIS Statis</p>
                    <p className="text-sm text-muted-foreground">
                      Customer scan QRIS lalu upload bukti transfer.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="qrisEnabled"
                    defaultChecked={settings.qrisEnabled === "true"}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-violet-500 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>

              {/* QRIS Preview + Upload */}
              <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-3">
                {settings.qrisImagePath && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Preview QRIS</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.qrisImagePath}
                      alt="QRIS"
                      className="h-24 w-24 rounded-lg border bg-white object-contain p-1"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Label htmlFor="qrisImage" className="text-xs font-medium">
                    Upload gambar QRIS baru (PNG, maks 5 MB)
                  </Label>
                  <input
                    id="qrisImage"
                    name="qrisImage"
                    type="file"
                    accept="image/png"
                    className="block w-full max-w-xs rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent-foreground"
                  />
                  <div>
                    <Label htmlFor="qrisMerchantName" className="text-xs font-medium">
                      Nama merchant QRIS
                    </Label>
                    <Input
                      id="qrisMerchantName"
                      name="qrisMerchantName"
                      defaultValue={settings.qrisMerchantName}
                      placeholder="MudahSewa"
                      className="mt-1 max-w-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Transfer Bank ── */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CreditCard className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium">Transfer Bank</p>
                    <p className="text-sm text-muted-foreground">
                      Customer transfer manual ke rekening lalu upload bukti.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="transferEnabled"
                    defaultChecked={settings.transferEnabled === "true"}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-blue-500 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="transferBankName" className="text-xs font-medium">
                    Nama Bank
                  </Label>
                  <Input
                    id="transferBankName"
                    name="transferBankName"
                    defaultValue={settings.transferBankName}
                    placeholder="BCA"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="transferAccountNumber" className="text-xs font-medium">
                    Nomor Rekening
                  </Label>
                  <Input
                    id="transferAccountNumber"
                    name="transferAccountNumber"
                    defaultValue={settings.transferAccountNumber}
                    placeholder="1234567890"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="transferAccountHolder" className="text-xs font-medium">
                    Atas Nama
                  </Label>
                  <Input
                    id="transferAccountHolder"
                    name="transferAccountHolder"
                    defaultValue={settings.transferAccountHolder}
                    placeholder="MudahSewa"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Save Button ── */}
          <div className="flex justify-end">
            <Button type="submit" className="gap-2">
              <Save className="size-4" aria-hidden />
              Simpan Konfigurasi
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
