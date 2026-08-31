"use client";

import { useFormStatus } from "react-dom";
import { Loader2, PlayCircle, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOpenWA, stopOpenWA } from "@/actions/openwa-gateway";

/** Tombol submit — menampilkan spinner selama server action berjalan.
 *  Dipisah karena `useFormStatus` hanya bekerja di child dari <form>.
 *
 *  State tombol mengikuti status gabungan gateway + dashboard:
 *  - keduanya running → Stop (menghentikan keduanya)
 *  - lainnya → Start (menjalankan proses yang belum ada) */
function ToggleSubmitButton({ running }: { running: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={running ? "destructive" : "default"}
      disabled={pending}
      className={running ? "" : "bg-emerald-600 text-white hover:bg-emerald-700"}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : running ? (
        <Power className="size-4" aria-hidden />
      ) : (
        <PlayCircle className="size-4" aria-hidden />
      )}
      {pending
        ? running
          ? "Menghentikan…"
          : "Menjalankan…"
        : running
          ? "Stop OpenWA"
          : "Start OpenWA"}
    </Button>
  );
}

/** Form Start/Stop proses OpenWA (gateway API port 2785 + dashboard UI
 *  port 2886) dari halaman admin WhatsApp. Start menjalankan proses yang
 *  belum ada (menangani state campuran, mis. gateway up tapi dashboard
 *  offline); Stop menghentikan keduanya. Konfirmasi hanya untuk stop
 *  (memutus koneksi aktif). */
export function GatewayToggleForm({
  running,
  partialRunning = false,
}: {
  running: boolean;
  partialRunning?: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <form
        action={running ? stopOpenWA : startOpenWA}
        onSubmit={(e) => {
          if (
            running &&
            !window.confirm(
              "Hentikan OpenWA (gateway + dashboard)? Koneksi WhatsApp yang aktif akan terputus."
            )
          ) {
            e.preventDefault();
          }
        }}
        className="flex items-center"
      >
        <ToggleSubmitButton running={running} />
      </form>
      {/* State campuran (hanya salah satu yang running) — tombol Start hanya
          menjalankan proses yang masih offline. */}
      {!running && partialRunning && (
        <p className="text-[11px] leading-tight text-amber-600">
          Satu service masih offline. Klik untuk menjalankan sisanya.
        </p>
      )}
    </div>
  );
}
