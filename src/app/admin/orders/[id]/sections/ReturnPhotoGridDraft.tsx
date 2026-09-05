"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { X } from "lucide-react";
import { storageUrl } from "@/lib/storage-url";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ReturnPhotoItem {
  id: number;
  filePath: string;
  uploadedAt: Date;
}

/**
 * Grid foto kondisi return dalam mode DRAFT.
 *
 * Sama seperti versi langsung, tapi tombol ✕ menandai foto untuk dihapus ke
 * draft — penghapusan baru dieksekusi saat tombol "Simpan" di header ditekan.
 * Foto yang sudah ditandai disembunyikan dari grid.
 */
export function ReturnPhotoGridDraft({
  photos,
}: {
  photos: ReturnPhotoItem[];
}) {
  const draft = useOptionalOrderDraft();

  // Tanpa provider draft tidak ada jalur hapus → sembunyikan grid.
  if (!draft) return null;
  if (photos.length === 0) return null;

  const marked = new Set(draft.returnPhotosToDelete);
  const visible = photos.filter((p) => !marked.has(p.id));
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {visible.map((p) => (
        <div key={p.id} className="group relative">
          {/* Klik foto → zoom di modal */}
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label={`Perbesar foto return ${format(p.uploadedAt, "dd MMM yyyy", { locale: localeId })}`}
                  className="block w-full cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storageUrl(p.filePath)}
                    alt={`Foto return ${format(p.uploadedAt, "dd MMMM yyyy, HH:mm", { locale: localeId })}`}
                    className="h-24 w-full rounded-lg border object-cover transition-opacity group-hover:opacity-80"
                  />
                </button>
              }
            />
            <DialogContent className="max-w-5xl sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>Foto Kondisi Return</DialogTitle>
                <DialogDescription>Klik di luar atau tekan ESC untuk menutup</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center bg-muted p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(p.filePath)}
                  alt={`Foto return ${format(p.uploadedAt, "dd MMMM yyyy, HH:mm", { locale: localeId })}`}
                  className="max-h-[75vh] max-w-full object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
          <p className="mt-1 truncate pr-6 text-xs text-muted-foreground">
            {format(p.uploadedAt, "dd MMM yyyy, HH:mm", { locale: localeId })}
          </p>
          {/* Tombol hapus (✕) — tandai ke draft, dialog konfirmasi */}
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label="Tandai foto return untuk dihapus"
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card/95 text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hapus foto ini?</DialogTitle>
                <DialogDescription>
                  Foto ditandai untuk dihapus — penghapusan baru terjadi setelah
                  Anda menekan tombol <strong>Simpan</strong> di atas halaman.
                  Bila berubah pikiran, tekan Batal di header.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={<Button type="button" variant="outline">Batal</Button>}
                />
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => draft.deleteReturnPhoto(p.id)}
                    >
                      Tandai Hapus
                    </Button>
                  }
                />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}
