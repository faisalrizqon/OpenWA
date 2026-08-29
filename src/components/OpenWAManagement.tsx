"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckUpdateButton } from "@/components/CheckUpdateButton";
import { InstallUpdateModal } from "@/components/InstallUpdateModal";
import type { CheckUpdateResult } from "@/actions/openwa-update";

/**
 * Kontrol manajemen update OpenWA: tombol "Periksa Update" + panel hasil check
 * + tombol "Update Sekarang" yang membuka modal instalasi. Alurnya:
 * 1. Periksa Update → fetch tag terbaru dari remote git
 * 2. Bila ada versi baru → tombol "Update Sekarang" aktif
 * 3. Update Sekarang → modal konfirmasi → proses multi-step dengan progress
 */
export function OpenWAManagement() {
  const router = useRouter();
  const [checkResult, setCheckResult] = useState<CheckUpdateResult | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <CheckUpdateButton onChecked={setCheckResult} />
        </div>

        <div className="flex items-center gap-2">
          {checkResult?.ok && (
            <Badge variant={checkResult.hasUpdate ? "default" : "secondary"}>
              v{checkResult.currentVersion}
              {checkResult.hasUpdate && ` → v${checkResult.latestVersion}`}
            </Badge>
          )}
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setShowInstallModal(true)}
            disabled={!checkResult?.ok || !checkResult.hasUpdate}
            title={
              !checkResult?.ok
                ? 'Klik "Periksa Update" terlebih dahulu'
                : checkResult.hasUpdate
                  ? `Update ke v${checkResult.latestVersion}`
                  : "Sudah versi terbaru"
            }
          >
            {checkResult?.ok && !checkResult.hasUpdate ? (
              <CheckCircle2 className="size-4" aria-hidden />
            ) : (
              <ArrowDownToLine className="size-4" aria-hidden />
            )}
            {checkResult?.ok && !checkResult.hasUpdate ? "Sudah Terbaru" : "Update Sekarang"}
          </Button>
        </div>
      </div>

      <InstallUpdateModal
        open={showInstallModal}
        onOpenChange={setShowInstallModal}
        targetTag={checkResult?.latestTag}
        currentVersion={checkResult?.currentVersion}
        onFinished={() => {
          setCheckResult(null);
          // Gateway di-stop updater di tahap pertama — refresh data server (status
          // gateway, versi) agar kartu menampilkan state nyata + tombol Start Gateway.
          router.refresh();
        }}
      />
    </>
  );
}
