"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface OpenClosedBadgeProps {
  /** String jam operasional, mis. "Setiap hari · 08.00 – 21.00". */
  hours: string;
}

function parseHoursRange(hours: string): { open: number; close: number } | null {
  const m = hours.match(/(\d{1,2})[.:](\d{2})\s*[–—-]\s*(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  if (isNaN(open) || isNaN(close)) return null;
  return { open, close };
}

function computeOpen(hours: string): boolean {
  const range = parseHoursRange(hours);
  if (!range) return true;
  const d = new Date();
  const cur = d.getHours() * 60 + d.getMinutes();
  return cur >= range.open && cur < range.close;
}

/** Badge compact OPEN/CLOSED untuk baris mobile (inline, small). */
export function OpenClosedBadge({ hours }: OpenClosedBadgeProps) {
  const [open, setOpen] = useState<boolean>(true);

  useEffect(() => {
    setOpen(computeOpen(hours));
  }, [hours]);

  const cls = cn(
    "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold tracking-tight shadow-sm",
    open
      ? "border-emerald-700/25 bg-emerald-700/10 text-emerald-700"
      : "border-rose-700/25 bg-rose-700/10 text-rose-700"
  );

  return (
    <span className={cls} aria-label={open ? "Toko buka" : "Toko tutup"}>
      <span className={`size-2 shrink-0 rounded-full ${open ? "bg-emerald-500" : "bg-rose-500"}`} />
      {open ? "BUKA" : "TUTUP"}
    </span>
  );
}
