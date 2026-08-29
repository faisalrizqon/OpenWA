"use client";

/**
 * Panel QRIS dinamis GoPay untuk customer (self-contained client component).
 *
 * Alur: fetch /api/payments/gopay/qr?orderNumber=... -> tampilkan QR
 * (nominal unik) -> polling tiap interval -> auto-update saat lunas/expired.
 */

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Loader2, QrCode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/pricing";

const POLL_INTERVAL_MS = 12_000;

interface QrResponse {
  status: string; // pending | paid | expired | cancelled | unavailable | closed
  qrString?: string;
  uniqueAmount?: number;
  expiresAt?: number;
}

export function GoPayQrisPanel({
  orderNumber,
  fallbackTotal,
  onPaid,
}: {
  orderNumber: string;
  /** Total order — dipakai sebagai keterangan sebelum QRIS pertama dimuat. */
  fallbackTotal: number;
  /** Dipanggil sekali ketika polling melihat status "paid". */
  onPaid?: () => void;
}) {
  const [data, setData] = React.useState<QrResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [checking, setChecking] = React.useState(false);
  const paidNotified = React.useRef(false);

  const load = React.useCallback(async (manual: boolean) => {
    if (manual) setChecking(true);
    try {
      const res = await fetch(`/api/payments/gopay/qr?orderNumber=${encodeURIComponent(orderNumber)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as QrResponse;
      setData(json);
      if (json.status === "paid" && !paidNotified.current) {
        paidNotified.current = true;
        onPaid?.();
      }
    } catch {
      // Jaringan error: biarkan state lama tampil; retry di siklus berikutnya.
    } finally {
      setLoading(false);
      if (manual) setChecking(false);
    }
  }, [orderNumber, onPaid]);

  React.useEffect(() => {
    void load(false);
    const timer = setInterval(() => void load(false), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const paid = data?.status === "paid";
  const expired = data?.status === "expired" || data?.status === "cancelled";
  const unavailable = data?.status === "unavailable" || data?.status === "closed";

  // Hitung mundur expire
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const remainingMs = data?.expiresAt ? Math.max(0, data.expiresAt - now) : null;
  const minutes = remainingMs !== null ? Math.floor(remainingMs / 60_000) : null;
  const seconds = remainingMs !== null ? Math.floor((remainingMs % 60_000) / 1_000) : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-emerald-600" aria-hidden />
            GoPay QRIS
          </CardTitle>
          <CardDescription>Menyiapkan QRIS dinamis untuk pesanan Anda…</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    );
  }

  if (paid) {
    return (
      <Card className="border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="size-5" aria-hidden />
            Pembayaran GoPay Diterima
          </CardTitle>
          <CardDescription>
            Dana sudah masuk ke merchant dan diverifikasi otomatis. Terima kasih!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (unavailable || !data?.qrString) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-emerald-600" aria-hidden />
            GoPay QRIS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            GoPay QRIS sedang tidak tersedia. Silakan pilih metode pembayaran lain.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-5 text-emerald-600" aria-hidden />
          GoPay QRIS
        </CardTitle>
        <CardDescription>
          Bayar <span className="font-semibold text-foreground">{formatRupiah(fallbackTotal)}</span>{" "}
          lewat GoPay / QRIS — nominal yang harus dibayar persis{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatRupiah(data.uniqueAmount ?? fallbackTotal)}
          </span>{" "}
          (nominal unik untuk verifikasi otomatis).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expired ? (
          <div className="space-y-3 rounded-xl border bg-amber-50/60 p-4 text-sm text-amber-800">
            <p className="font-medium">QRIS ini sudah kedaluwarsa.</p>
            <Button type="button" variant="outline" onClick={() => void load(true)} disabled={checking}>
              {checking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
              Buat QRIS Baru
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border bg-white p-3 shadow-sm">
                <QRCodeSVG value={data.qrString} size={224} level="M" />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Scan dengan GoPay / m-banking / e-wallet apa pun yang mendukung QRIS.
                {minutes !== null && seconds !== null && (
                  <> Berlaku{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {minutes}:{String(seconds).padStart(2, "0")}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Status dicek otomatis tiap 12 detik.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void load(true)} disabled={checking}>
                {checking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
                Cek Sekarang
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
