"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: { skipOrderSummary?: boolean }) => void;
    };
  }
}

/** Tombol pembayaran Midtrans Snap: load script Snap lalu buka popup pembayaran. */
export function MidtransPayButton({
  token,
  isProduction,
  clientKey,
}: {
  token: string;
  isProduction: boolean;
  clientKey: string;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
    const existing = document.querySelector<HTMLScriptElement>("script[data-midtrans]");
    if (existing) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `${baseUrl}/snap/snap.js`;
    script.setAttribute("data-client-key", clientKey);
    script.setAttribute("data-midtrans", "true");
    script.onload = () => setReady(true);
    script.onerror = () => setError("Gagal memuat layanan pembayaran. Coba lagi nanti.");
    document.body.appendChild(script);
  }, [clientKey, isProduction]);

  const handlePay = () => {
    if (!window.snap) {
      setError("Layanan pembayaran belum siap. Coba lagi beberapa detik.");
      return;
    }
    window.snap.pay(token, { skipOrderSummary: false });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="h-11 w-full text-base"
        onClick={handlePay}
        disabled={!ready || Boolean(error)}
      >
        <CreditCard className="size-5" aria-hidden />
        Lanjutkan Pembayaran Online
      </Button>
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <p className="text-center text-xs text-muted-foreground">
        QRIS, GoPay, OVO, ShopeePay, kartu kredit, dan VA bank didukung.
      </p>
    </div>
  );
}
