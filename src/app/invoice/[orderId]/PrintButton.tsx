"use client";

import { Printer } from "lucide-react";

/** Tombol cetak untuk halaman invoice (window.print — butuh client component). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <Printer className="size-4" aria-hidden />
      Cetak / Simpan PDF
    </button>
  );
}
