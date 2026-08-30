"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Container, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setOpenWADashboardMode } from "@/actions/openwa-gateway";
import type { OpenWADeploymentMode } from "@/lib/openwa-api-client";

/** Tombol submit segmented control — spinner selama server action berjalan.
 *  Dipisah karena `useFormStatus` hanya bekerja di child dari <form>. */
function ModeButton({
  value,
  label,
  description,
  icon: Icon,
  active,
}: {
  value: OpenWADeploymentMode;
  label: string;
  description: string;
  icon: typeof Container;
  active: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="mode"
      value={value}
      disabled={pending || active}
      aria-pressed={active}
      className={
        "flex flex-1 items-start gap-3 rounded-lg border p-3 text-left transition-colors " +
        (active
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-border bg-card hover:bg-accent")
      }
    >
      <Icon
        className={
          "mt-0.5 size-5 shrink-0 " +
          (active ? "text-emerald-600" : "text-muted-foreground")
        }
        aria-hidden
      />
      <span className="min-w-0">
        <span
          className={
            "flex items-center gap-1.5 text-sm font-semibold " +
            (active ? "text-emerald-700 dark:text-emerald-400" : "text-foreground")
          }
        >
          {label}
          {active && pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

/**
 * Switcher mode deployment OpenWA — menggantikan pola "on/off" buta yang selalu
 * menjalankan DUA proses (gateway + Vite dev server).
 *
 *  - **Docker / Bundled** (default produksi): SATU proses — gateway menyajikan API
 *    sekaligus UI dashboard dari build `dashboard/dist`. Hemat resource.
 *  - **Local / Split** (pengembangan): gateway API + Vite dev server (:2886) untuk
 *    hot-reload saat mengutak-atik dashboard OpenWA.
 *
 * Mode disimpan via server action `setOpenWADashboardMode` (file override — berlaku
 * tanpa restart app Next.js). Proses yang berjalan tidak dimatikan otomatis; tombol
 * Start/Stop di kartu status memakai mode ini saat spawn berikutnya.
 */
export function DeploymentModeForm({ mode }: { mode: OpenWADeploymentMode }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Mode deployment</p>
        <p className="text-xs text-muted-foreground">
          Menentukan proses mana yang dijalankan tombol Start — pilih satu, jangan keduanya, supaya hemat resource.
        </p>
      </div>
      <form action={setOpenWADashboardMode} className="flex flex-col gap-2 sm:flex-row">
        <ModeButton
          value="bundled"
          label="Docker / Bundled"
          description="1 proses: gateway menyajikan API + UI dashboard (port 2785). Pilihan produksi — paling hemat."
          icon={Container}
          active={mode === "bundled"}
        />
        <ModeButton
          value="split"
          label="Local / Split"
          description="2 proses: gateway API (2785) + Vite dev server (2886). Hanya untuk mengembangkan UI dashboard (hot-reload)."
          icon={Terminal}
          active={mode === "split"}
        />
      </form>
      {mode === "split" && (
        <p className="text-[11px] leading-tight text-amber-600">
          Mode split menjalankan dua proses — gunakan hanya saat mengembangkan dashboard OpenWA, lalu kembali ke Bundled.
        </p>
      )}
    </div>
  );
}
