"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkOpenWAUpdate, type CheckUpdateResult } from "@/actions/openwa-update";

interface CheckUpdateButtonProps {
  /** Dipanggil dengan hasil check — parent bisa memakainya untuk membuka modal install. */
  onChecked?: (result: CheckUpdateResult) => void;
}

/** Tombol cek update OpenWA versi terbaru dari remote git. */
export function CheckUpdateButton({ onChecked }: CheckUpdateButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await checkOpenWAUpdate();
      if (!res.ok) {
        toast.error("Gagal cek update", { description: res.error ?? "Tidak dapat menghubungi remote" });
      } else if (res.hasUpdate) {
        toast.success(`Update tersedia: v${res.latestVersion}`, {
          description: `Versi saat ini v${res.currentVersion}. Klik "Update Sekarang" untuk memasang.`,
          action: {
            label: "Lihat Rilis",
            onClick: () => window.open(res.releaseUrl, "_blank", "noopener,noreferrer"),
          },
        });
      } else {
        toast.success("Sudah versi terbaru", { description: `Menjalankan v${res.currentVersion}` });
      }
      onChecked?.(res);
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? (
        <RefreshCw className="size-4 animate-spin" aria-hidden />
      ) : (
        <CheckCircle2 className="size-4" aria-hidden />
      )}
      {loading ? "Memeriksa..." : "Periksa Update"}
    </Button>
  );
}
