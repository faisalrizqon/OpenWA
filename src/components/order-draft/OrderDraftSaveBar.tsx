"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    startTransition(async () => {
      const result = await batchCommitAllChanges(fd);

      if (result.ok) {
        // Notifikasi sukses muncul SEKALI via toast client-side — bukan dari
        // query param URL. Jadi refresh browser hanya memuat ulang tab tanpa
        // memunculkan ulang notif "berhasil disimpan" (tidak ada loop save).
        toast.success("Perubahan berhasil disimpan");
        // Buang draft lalu segarkan data server. URL tetap bersih
        // (/admin/orders/[id]) tanpa ?saved=1&changes=...
        reset();
        router.refresh();
      } else {
        // Gagal: draft DIPERTAHANKAN supaya user tidak kehilangan isian.
        toast.error(
          result.error === "file"
            ? "File tidak valid — maksimal 15MB (file di atas 3MB dikompres otomatis)."
            : result.error
        );
      }
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
