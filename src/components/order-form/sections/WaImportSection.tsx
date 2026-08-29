"use client";

import { ClipboardPaste, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import type { ParsedBooking } from "@/lib/parseBooking";
export interface WaImportSectionProps {
  waMessage: string;
  setWaMessage: (msg: string) => void;
  waParsed: ParsedBooking | null;
  onApplyBookingMessage: () => void;
}

/** WA import section with auto-fill button and parsed message preview. */
export function WaImportSection({
  waMessage,
  setWaMessage,
  waParsed,
  onApplyBookingMessage,
}: WaImportSectionProps) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <ClipboardPaste className="size-3.5" aria-hidden />
        </span>
        Import Pesan Booking WA (opsional)
      </h2>
      <textarea
        value={waMessage}
        onChange={(e) => setWaMessage(e.target.value)}
        placeholder={`Tempel pesan booking di sini, mis:
Nama Penyewa : maya okta
Jenis Kamera : canon ps a4000
Durasi (berapa hari) : 6jam
Jaminan (KTP/SIM) : ktp
Lokasi COD : Weleri
Tanggal Booking/Sewa : 23 agustus 2026,minggu`}
        className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onApplyBookingMessage}
          disabled={waMessage.trim().length === 0}
          className="gap-1.5"
        >
          <Wand2 className="size-4" aria-hidden />
          Isi Otomatis
        </Button>
        {waParsed && (
          <p className="text-xs text-muted-foreground">
            Terbaca: {waParsed.nama ?? "—"} · {waParsed.kamera ?? "—"} ·{" "}
            {waParsed.durasiJam ? `${waParsed.durasiJam} jam` : "—"} ·{" "}
            {waParsed.tanggal
              ? format(waParsed.tanggal, "dd MMMM yyyy", { locale: localeId })
              : "—"}
          </p>
        )}
      </div>
    </section>
  );
}

