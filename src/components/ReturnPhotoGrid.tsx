"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { X } from "lucide-react";
import { storageUrl } from "@/lib/storage-url";
import { deleteReturnPhoto } from "@/actions/orders";
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
 * Grid foto kondisi return. Setiap foto punya tombol ✕ dengan dialog
 * konfirmasi — untuk revisi bila salah upload (konsisten dengan jaminan).
 */
export function ReturnPhotoGrid({
  orderId,
  photos,
}: {
  orderId: string;
  photos: ReturnPhotoItem[];
}) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {photos.map((p) => (
        <div key={p.id} className="group relative">
          {/* Klik foto → zoom di modal (bukan buka tab baru) */}
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
            {format(p.uploadedAt, "dd MMMM yyyy, HH:mm", { locale: localeId })}
          </p>
          {/* Tombol hapus (✕) — dialog konfirmasi sebelum delete */}
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label="Hapus foto return"
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
                  Foto kondisi return akan dihapus permanen. Gunakan ini untuk
                  revisi bila salah upload — kamu bisa selesaikan order ulang
                  dengan foto yang benar.
                </DialogDescription>
              </DialogHeader>
              <form action={deleteReturnPhoto}>
                <input type="hidden" name="returnPhotoId" value={p.id} />
                <input type="hidden" name="orderId" value={orderId} />
                <DialogFooter>
                  <DialogClose
                    render={<Button type="button" variant="outline">Batal</Button>}
                  />
                  <Button type="submit" variant="destructive">
                    Ya, Hapus
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}
