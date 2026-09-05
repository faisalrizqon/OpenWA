"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { installOpenWAUpdate, type UpdateProgress } from "@/actions/openwa-update";
import { useUpdateProgress } from "@/hooks/useUpdateProgress";

interface InstallUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tag git yang akan dipasang (mis. "v0.24.0"). Bila kosong, action ambil tag terbaru. */
  targetTag?: string;
  /** Versi saat ini — ditampilkan di konfirmasi sebelum update. */
  currentVersion?: string;
  /** Dipanggil saat update berakhir (sukses/gagal) — parent me-reset hasil check lama. */
  onFinished?: (progress: UpdateProgress) => void;
}

type Phase = "confirm" | "starting" | "running";

/** Modal instalasi update OpenWA dengan progress per step yang dipoll live dari updater. */
export function InstallUpdateModal({
  open,
  onOpenChange,
  targetTag,
  currentVersion,
  onFinished,
}: InstallUpdateModalProps) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { progress: polled, polling, start: startPolling, stop: stopPolling } = useUpdateProgress({
    intervalMs: 3000,
    onDone: (done) => {
      setProgress(done);
      setPhase("confirm");
      if (done.status === "success") {
        toast.success("Update selesai", { description: done.message });
      } else {
        toast.error("Update gagal", { description: done.message });
      }
      onFinished?.(done);
    },
  });

  // Update berjalan di updater detached terlepas dari modal: tutup modal = stop
  // polling (hemat log); buka lagi saat masih running = lanjutkan polling.
  useEffect(() => {
    if (!open && phase === "running" && polling) stopPolling();
    if (open && phase === "running" && !polling) startPolling();
  }, [open, phase, polling, startPolling, stopPolling]);

  const handleClose = () => {
    if (phase !== "starting") onOpenChange(false);
  };

  const handleInstall = async () => {
    setPhase("starting");
    setError(null);
    try {
      const res = await installOpenWAUpdate(targetTag);
      if (!res.ok) {
        setError(res.message);
        setPhase("confirm");
        return;
      }
      // "Tidak ada update" dikembalikan sebagai ok=true tanpa proses.
      if (res.message.startsWith("Tidak ada update")) {
        toast.info(res.message);
        setPhase("confirm");
        onOpenChange(false);
        return;
      }
      setProgress(null);
      setPhase("running");
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("confirm");
    }
  };

  // Sumber progress: hasil poll live; fallback ke progress akhir yang tersimpan.
  const liveProgress: UpdateProgress | null = polled ?? progress;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        {phase !== "running" ? (
          <>
            <DialogHeader>
              <DialogTitle>Update OpenWA Gateway</DialogTitle>
              <DialogDescription>
                Perbarui aplikasi ke versi terbaru dari GitHub. Proses ini akan memutus sesi
                WhatsApp yang sedang aktif.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-5 text-amber-600" aria-hidden />
                    Informasi Penting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>Tindakan ini akan:</strong>
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Memutuskan koneksi WhatsApp gateway yang sedang aktif</li>
                    <li>Mengunduh versi terbaru dari GitHub rmyndharis/OpenWA</li>
                    <li>Backup folder data (retensi 3 backup terbaru)</li>
                    <li>Build ulang aplikasi dan dashboard</li>
                    <li>
                      Mengembalikan perubahan lokal — bila konflik, proses berhenti dengan panduan
                      resolusi manual
                    </li>
                  </ul>
                  <p className="italic text-amber-700 dark:text-amber-400">
                    Proses bisa memakan waktu 5–15 menit. Jangan matikan server selama berjalan.
                  </p>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent p-3 text-sm">
                {currentVersion && (
                  <>
                    <span>Versi saat ini:</span>
                    <Badge variant="secondary">v{currentVersion}</Badge>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  </>
                )}
                {targetTag ? (
                  <>
                    <span>Target:</span>
                    <Badge>{targetTag}</Badge>
                  </>
                ) : (
                  <span className="text-muted-foreground">Target: tag rilis terbaru</span>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={phase === "starting"}>
                Batal
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleInstall}
                disabled={phase === "starting"}
              >
                {phase === "starting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Memulai...
                  </>
                ) : (
                  "Update Sekarang"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Update Berjalan</DialogTitle>
              <DialogDescription>
                {liveProgress?.targetTag
                  ? `Memasang ${liveProgress.targetTag} — progress diperbarui otomatis tiap 3 detik`
                  : "Memulai updater..."}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {(liveProgress?.steps ?? []).map((step) => (
                <div key={step.step} className="flex items-start gap-3 rounded-md border p-3">
                  <span aria-hidden>
                    {step.status === "success" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : step.status === "error" ? (
                      <X className="size-4 text-red-600" />
                    ) : step.status === "warning" ? (
                      <AlertTriangle className="size-4 text-amber-600" />
                    ) : (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {step.step}
                    </p>
                    <p className="text-sm">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <span className="mr-auto text-xs text-muted-foreground">
                Modal bisa ditutup — proses tetap berjalan di latar belakang.
              </span>
              <Button onClick={handleClose}>Tutup</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
