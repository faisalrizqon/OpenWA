"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { batchCommitAllChanges } from "@/actions/orders-batch-commit";
import { useOrderDraft } from "./OrderDraftContext";

/**
 * Tombol Simpan / Batal di header, sebelah tombol Hapus Order.
 *
 * Muncul HANYA bila ada draft perubahan yang belum disimpan. Semua edit di
 * card-card bawah bersifat draft; tombol inilah satu-satunya jalur tulis ke
 * database. Batal membuang draft dan menyegarkan tampilan dari data server.
 */
export function OrderDraftSaveBar({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { dirty, buildFormData, reset } = useOrderDraft();
  const [pending, startTransition] = useTransition();

  if (!dirty) return null;

  function handleSave() {
    const fd = buildFormData(orderId);
    // Jangan reset di sini: aksi selalu redirect. Bila gagal, draft harus tetap
    // ada supaya user tidak kehilangan perubahan yang sudah diisi.
    startTransition(async () => {
      await batchCommitAllChanges(fd);
    });
  }

  function handleCancel() {
    reset();
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={pending}
        className="gap-1.5"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Batal
      </Button>
      <Button type="button" size="sm" onClick={handleSave} disabled={pending} className="gap-1.5">
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Check className="size-3.5" aria-hidden />
        )}
        Simpan
      </Button>
    </div>
  );
}
