"use client";

/**
 * Kartu konfigurasi GoPay Merchant di admin (tab Konfigurasi Metode).
 *
 * Alur gateway: login OTP GoPay Merchant dijalankan SEKALI lewat terminal
 * gateway (`node login.js`); gateway menyimpan sesi dan me-refresh token
 * otomatis tiap 6 jam. Dari dashboard admin:
 * - Start/Stop proses gateway (tanpa buka terminal)
 * - "Sinkronkan" menarik status gateway → aktifkan/nonaktifkan metode GoPay
 */

import * as React from "react";
import { Loader2, LogOut, Power, RefreshCw, Square, TerminalSquare, Wallet } from "lucide-react";
import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { syncGopaySession, logoutGopay } from "@/actions/gopay-auth";
import { startGopayGateway, stopGopayGateway } from "@/actions/gopay-gateway";
import type { GopaySyncState } from "@/actions/gopay-auth";

const initialSync: GopaySyncState = {};

export function GoPayAdminCard({
  loggedIn,
  merchantName,
  lastLoginAt,
  gatewayRunning,
  gatewayPort,
}: {
  loggedIn: boolean;
  merchantName: string | null;
  lastLoginAt: string | null;
  gatewayRunning: boolean;
  gatewayPort: number;
}) {
  const [syncState, syncAction, syncPending] = useActionState(syncGopaySession, initialSync);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [pendingControl, setPendingControl] = React.useState<"start" | "stop" | null>(null);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="size-5" aria-hidden />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">GoPay QRIS Dinamis (Gateway)</p>
                <span
                  className={
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                    (gatewayRunning
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500")
                  }
                >
                  <span
                    className={
                      "size-1.5 rounded-full " + (gatewayRunning ? "bg-emerald-500" : "bg-zinc-400")
                    }
                  />
                  {gatewayRunning ? "Gateway Online" : "Gateway Offline"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {loggedIn ? (
                  <>
                    Terhubung sebagai{" "}
                    <span className="font-medium text-foreground">{merchantName ?? "GoPay Merchant"}</span>
                    {lastLoginAt ? ` · sinkron ${lastLoginAt}` : ""}
                  </>
                ) : gatewayRunning ? (
                  "Gateway online — sesi GoPay Merchant belum login (jalankan login.js sekali)."
                ) : (
                  "Gateway belum berjalan — klik Mulai Gateway lalu login via terminal."
                )}
              </p>
            </div>
          </div>
          {loggedIn && (
            <form action={logoutGopay}>
              <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                <LogOut className="size-4" aria-hidden />
                Putuskan
              </Button>
            </form>
          )}
        </div>

        {/* Kontrol proses gateway */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
          <p className="mr-auto text-xs font-medium text-muted-foreground">
            Proses gateway (port {gatewayPort})
          </p>
          {gatewayRunning ? (
            <form action={stopGopayGateway} onSubmit={() => setPendingControl("stop")}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                disabled={pendingControl !== null}
              >
                {pendingControl === "stop" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Square className="size-4" aria-hidden />
                )}
                Stop Gateway
              </Button>
            </form>
          ) : (
            <form action={startGopayGateway} onSubmit={() => setPendingControl("start")}>
              <Button
                type="submit"
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                disabled={pendingControl !== null}
              >
                {pendingControl === "start" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Power className="size-4" aria-hidden />
                )}
                Mulai Gateway
              </Button>
            </form>
          )}
          <form action={syncAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={syncPending || pendingControl !== null}
            >
              {syncPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              Sinkronkan Status
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowInstructions((v) => !v)}
          >
            <TerminalSquare className="size-4" aria-hidden />
            Cara Login
          </Button>
        </div>

        {loggedIn ? (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Metode GoPay aktif di checkout. QRIS dinamis dibuat otomatis per order dan
            pembayaran diverifikasi otomatis dari mutasi GoPay Merchant via gateway —
            token di-refresh otomatis tiap 6 jam tanpa login ulang.
          </div>
        ) : (
          <div className="space-y-2">
            {syncState.error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {syncState.error}
              </p>
            )}
            {syncState.message && !syncState.error && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {syncState.message}
              </p>
            )}
          </div>
        )}

        {showInstructions && (
          <div className="rounded-lg bg-zinc-900 px-4 py-3 text-xs text-zinc-100">
            <p className="mb-2 font-medium text-emerald-400">
              Login OTP sekali di terminal gateway (setelah gateway running):
            </p>
            <pre className="overflow-x-auto leading-relaxed">{`cd gopay-gateway
npm install        # sekali saja
node login.js
# 1. Masukkan nomor HP GoPay Merchant
# 2. Masukkan kode OTP (SMS/WhatsApp)
# Sesi tersimpan & token auto-refresh tiap 6 jam`}</pre>
            <p className="mt-2 text-zinc-400">
              Setelah login berhasil, tekan tombol{" "}
              <span className="font-medium text-zinc-200">Sinkronkan Status</span> di atas
              untuk mengaktifkan metode GoPay di checkout.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Integrasi tidak resmi (endpoint privat GoPay Merchant). Gunakan hanya untuk akun
          merchant milik sendiri; polling agresif berisiko pembatasan akun.
        </p>
      </CardContent>
    </Card>
  );
}
