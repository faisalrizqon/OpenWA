/**
 * Poller status update OpenWA: ambil progress JSON yang ditulis
 * scripts/openwa-updater.cjs (via GET /api/update-progress) tiap `intervalMs`.
 * Callback onDone dipanggil sekali saat proses berakhir (sukses/gagal) supaya
 * modal bisa refresh state induk dan stop polling.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UpdateProgress } from "@/actions/openwa-update";

interface UseUpdateProgressArgs {
  intervalMs?: number;
  onDone?: (progress: UpdateProgress) => void;
}

export function useUpdateProgress({ intervalMs = 3000, onDone }: UseUpdateProgressArgs = {}) {
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [polling, setPolling] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!polling) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/update-progress?_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as UpdateProgress | null;
        if (!data) return;
        setProgress(data);
        if (data.status !== "running") {
          setPolling(false);
          onDoneRef.current?.(data);
        }
      } catch {
        /* error jaringan sementara — coba lagi tick berikutnya */
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [polling, intervalMs]);

  const start = useCallback(() => {
    setProgress(null);
    setPolling(true);
  }, []);

  const stop = useCallback(() => setPolling(false), []);

  return { progress, polling, start, stop };
}
