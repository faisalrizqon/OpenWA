"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { storageUrl } from "@/lib/storage-url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
 * Grid foto kondisi return (klik untuk zoom). Penghapusan data TIDAK lagi
 * per-foto di sini — semua hapusan order disatukan lewat dialog &ldquo;Hapus Data Order&rdquo;
 * di bagian bawah halaman detail order.
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
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {format(p.uploadedAt, "dd MMM yyyy, HH:mm", { locale: localeId })}
          </p>
        </div>
      ))}
    </div>
  );
}
