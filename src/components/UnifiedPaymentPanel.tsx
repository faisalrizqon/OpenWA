"use client";

import * as React from "react";
import { Banknote, QrCode, CreditCard, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { formatRupiah } from "@/lib/pricing";
import { midtransConfigured } from "@/lib/payment";
import type { StoreSettings } from "@/lib/content";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MidtransPayButton } from "@/components/MidtransPayButton";
import { GuaranteeDocs, GuaranteeUpload, type GuaranteeDoc } from "@/components/GuaranteeUpload";
import { submitGuarantee } from "@/app/(shop)/actions/checkout";
import { submitPaymentProof } from "@/app/(shop)/actions/checkout";
import { cn } from "@/lib/utils";
import { GoPayQrisPanel } from "@/components/GoPayQrisPanel";

/** Subset order yang dibutuhkan unified payment panel. */
export interface UnifiedPaymentOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentRef: string | null;
  paymentCompleted: boolean;
  courierFee: number;
  tipAmount: number;
  payments: Array<{ status: string; proofPath: string | null }>;
  documents: GuaranteeDoc[];
}

interface MethodTab {
  value: string;
  label: string;
  icon: LucideIcon;
}

/** Opsi metode pembayaran yang tersedia di panel unified. */
function buildTabs(transferEnabled: boolean, gopayEnabled: boolean): MethodTab[] {
  return [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "qris", label: "QRIS", icon: QrCode },
    ...(transferEnabled ? [{ value: "transfer", label: "Transfer Bank", icon: CreditCard }] : []),
    ...(gopayEnabled ? [{ value: "gopay", label: "GoPay", icon: Wallet }] : []),
    ...(midtransConfigured() ? [{ value: "midtrans", label: "Online (Midtrans)", icon: CreditCard }] : []),
  ];
}

/**
 * Panel pembayaran unified: customer memilih metode (cash/qris/transfer/midtrans),
 * melengkapi kolom wajib per metode, lalu menekan SATU tombol "Selesai & Kirim".
 * Server action `completeOrder` memvalidasi kelengkapan; order ditandai
 * `paymentCompleted` dan masuk antrian dashboard admin.
 */
export function UnifiedPaymentPanel({
  order,
  shop,
  total,
  back,
}: {
  order: UnifiedPaymentOrder;
  shop: StoreSettings;
  /** Total item (tanpa ongkir & tip). */
  total: number;
  /** URL kembali setelah aksi (order-status / payment page). */
  back: string;
}) {
  const tabs = buildTabs(shop.transferEnabled === "true", shop.gopayEnabled === "true");
  const initial = tabs.some((t) => t.value === order.paymentMethod)
    ? (order.paymentMethod as string)
    : "cash";
  const [method, setMethod] = React.useState(initial);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  // GoPay: panel QRIS memberi sinyal saat polling melihat status paid.
  const [gopayPaid, setGopayPaid] = React.useState(false);

  const grandTotal = total + order.courierFee + order.tipAmount;

  const hasIdentityDoc = order.documents.some((d) => ["ktp", "kartu_pelajar"].includes(d.docType));
  const hasSelfieDoc = order.documents.some((d) => d.docType === "selfie_ktp");
  const proofUploaded = order.payments.some((p) => p.status === "pending" && p.proofPath);
  const confirmed = order.payments.some((p) => p.status === "confirmed");


  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setProofFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  // Order sudah ditandai lengkap — tampilkan ringkasan, bukan form lagi.
  if (order.paymentCompleted || confirmed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="size-5" aria-hidden />
            Pembayaran Sudah Lengkap
          </CardTitle>
          <CardDescription>
            Semua data pembayaran telah dikirim. Admin akan mengonfirmasi pesanan Anda —
            pantau statusnya di halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Metode: <span className="font-medium text-foreground">{method}</span> · Total:{" "}
          <span className="font-semibold tabular-nums text-foreground">{formatRupiah(grandTotal)}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pilih Metode Pembayaran</CardTitle>
          <CardDescription>
            Pilih salah satu metode, lengkapi kolom wajibnya, lalu tekan{" "}
            <span className="font-medium text-foreground">Selesai & Kirim</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab metode */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = method === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setMethod(tab.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form upload bukti (QRIS/transfer) — HANYA menyimpan bukti, tidak memfinalisasi order.
              Finalisasi dilakukan lewat tombol "Selesaikan Orderan" di bawah halaman. */}
          <form action={submitPaymentProof} className="space-y-4">
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <input type="hidden" name="back" value={back} />

            {method === "cash" && (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
                <p>
                  Bayar tunai sebesar{" "}
                  <span className="font-semibold tabular-nums">{formatRupiah(grandTotal)}</span>{" "}
                  saat pengambilan / pengantaran unit.
                </p>
                <p className="text-xs text-muted-foreground">
                  1. Admin mengonfirmasi pesanan via WhatsApp. 2. Siapkan jaminan: foto identitas
                  (KTP / kartu pelajar) DAN foto selfie sambil memegang identitas (upload di
                  bagian bawah). 3. Bayar tunai saat menerima unit.
                </p>
                {!(hasIdentityDoc && hasSelfieDoc) && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Jaminan belum lengkap. Wajib upload <strong>foto identitas</strong> (KTP / kartu pelajar) DAN <strong>foto selfie</strong>. Lengkapi keduanya di bagian Jaminan di bawah, lalu klik <strong>Selesaikan Orderan</strong>.
                  </p>
                )}
              </div>
            )}

            {method === "qris" && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border bg-white p-3 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shop.qrisImagePath}
                    alt={`QRIS ${shop.qrisMerchantName}`}
                    className="size-56 object-contain"
                  />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  a.n. <span className="font-medium">{shop.qrisMerchantName}</span> — bayar sebesar{" "}
                  <span className="font-semibold text-foreground">{formatRupiah(grandTotal)}</span>
                </p>
                {!proofUploaded && !confirmed && (
                  <div className="w-full space-y-1.5">
                    <Label htmlFor="proof">Upload bukti pembayaran (screenshot/foto)</Label>
                    <input
                      id="proof"
                      name="proof"
                      type="file"
                      accept="*/*"
                      onChange={handleProofChange}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                    />
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="Preview bukti pembayaran"
                        className="h-28 rounded-lg border object-contain"
                      />
                    )}
                    <Button
                      type="submit"
                      disabled={proofFile === null}
                      className="h-10 w-full gap-2 text-sm font-semibold"
                    >
                      Simpan Bukti Pembayaran
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Tombol ini hanya menyimpan bukti. Klik <span className="font-medium">Selesaikan Orderan</span> di bawah setelah yakin.
                    </p>
                  </div>
                )}
              </div>
            )}

            {method === "transfer" && (
              <div className="space-y-4">
                {shop.transferEnabled === "true" && shop.transferAccountNumber ? (
                  <>
                    <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-[auto_1fr]">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-semibold">{shop.transferBankName}</span>
                      <span className="text-muted-foreground">Nomor Rekening</span>
                      <span className="font-mono font-semibold tracking-widest">{shop.transferAccountNumber}</span>
                      <span className="text-muted-foreground">Atas Nama</span>
                      <span>{shop.transferAccountHolder}</span>
                      <span className="text-muted-foreground">Total Transfer</span>
                      <span className="font-semibold tabular-nums text-emerald-700">{formatRupiah(grandTotal)}</span>
                    </div>
                    {!proofUploaded && !confirmed && (
                      <div className="space-y-1.5">
                        <Label htmlFor="proof">Upload bukti transfer (screenshot/foto)</Label>
                        <input
                          id="proof"
                          name="proof"
                          type="file"
                          accept="*/*"
                          onChange={handleProofChange}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                        />
                        {previewUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt="Preview bukti transfer"
                            className="h-28 rounded-lg border object-contain"
                          />
                        )}
                        <Button
                          type="submit"
                          disabled={proofFile === null}
                          className="h-10 w-full gap-2 text-sm font-semibold"
                        >
                          Simpan Bukti Transfer
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                          Tombol ini hanya menyimpan bukti. Klik <span className="font-medium">Selesaikan Orderan</span> di bawah setelah yakin.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    Pembayaran transfer belum dikonfigurasi. Silakan pilih metode lain atau
                    hubungi admin.
                  </p>
                )}
              </div>
            )}

            {method === "midtrans" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  QRIS dinamis, e-wallet, VA, dan kartu kredit via Midtrans.
                </p>
                {order.paymentRef ? (
                  <MidtransPayButton
                    token={order.paymentRef}
                    isProduction={process.env.MIDTRANS_IS_PRODUCTION === "true"}
                    clientKey={process.env.MIDTRANS_CLIENT_KEY ?? ""}
                  />
                ) : (
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    Pembayaran online sedang tidak dapat diproses. Silakan pilih metode lain
                    atau hubungi admin.
                  </p>
                )}
              </div>
            )}

            {method === "gopay" && (
              <GoPayQrisPanel
                orderNumber={order.orderNumber}
                fallbackTotal={grandTotal}
                onPaid={() => setGopayPaid(true)}
              />
            )}

          {/* Info langkah selanjutnya per metode — tanpa tombol submit di sini.
              Finalisasi order dilakukan via tombol "Selesaikan Orderan" di bawah halaman,
              supaya customer tidak salah upload / tidak sengaja finalize. */}
          <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
            {method === "cash" && (
              <p>
                Metode Cash (COD) — <span className="font-semibold">tidak ada upload pembayaran</span>.
                Bayar tunai saat menerima unit. Pastikan jaminan (foto identitas + selfie) sudah
                lengkap, lalu klik <span className="font-semibold text-primary">Selesaikan Orderan</span> di bawah.
              </p>
            )}
            {(method === "qris" || method === "transfer") && (
              <p>
                Upload bukti pembayaran di atas hanya untuk <span className="font-semibold">menyimpan bukti</span> —
                belum memfinalisasi pesanan. Setelah bukti tersimpan dan datanya benar, klik{" "}
                <span className="font-semibold text-primary">Selesaikan Orderan</span> di bawah untuk mengirim pesanan.
              </p>
            )}
            {method === "midtrans" && (
              <p>
                Selesaikan pembayaran via Midtrans di atas. Setelah lunas, klik{" "}
                <span className="font-semibold text-primary">Selesaikan Orderan</span> di bawah untuk mengirim pesanan.
              </p>
            )}
            {method === "gopay" && (
              <p>
                Scan QRIS GoPay di atas dan selesaikan pembayaran. Setelah lunas, klik{" "}
                <span className="font-semibold text-primary">Selesaikan Orderan</span> di bawah untuk mengirim pesanan.
              </p>
            )}
          </div>
          </form>
        </CardContent>
      </Card>

      {/* Jaminan — tetap di halaman yang sama (wajib 2 dokumen untuk cash) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" aria-hidden />
            Jaminan{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {method === "cash" ? "(wajib: foto identitas + selfie)" : "(opsional — pelengkap data)"}
            </span>
          </CardTitle>
          <CardDescription>
            {method === "cash"
              ? "Wajib upload 2 dokumen: foto identitas (KTP / kartu pelajar) DAN foto selfie sambil memegang identitas."
              : "Upload KTP / selfie identitas / kartu pelajar sebagai jaminan sewa — langsung di halaman ini."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GuaranteeDocs
            orderId={order.id}
            documents={order.documents}
            back={back}
            columns="grid-cols-2 sm:grid-cols-3"
          />
          <GuaranteeUpload orderId={order.id} action={submitGuarantee} back={back} />
        </CardContent>
      </Card>
    </div>
  );
}
