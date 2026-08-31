"use client";

import { Trash2 } from "lucide-react";
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
import { deleteOrderData } from "@/actions/orders";

/**
 * Dialog terpadu "Hapus Data Order": SATU tombol menghapus SEMUA data order
 * sekaligus — seluruh dokumen jaminan (KTP/selfie/kartu pelajar) + seluruh
 * foto kondisi return. Menggantikan tombol ✕ per-foto yang tadinya tersebar.
 */
export function OrderUnifiedDeleteDialog({
  orderId,
  back,
}: {
  orderId: string;
  back: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="destructive" size="sm" className="gap-1.5">
            <Trash2 className="size-3.5" aria-hidden />
            Hapus Data Order
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus semua data order ini?</DialogTitle>
          <DialogDescription>
            Seluruh dokumen jaminan (KTP / selfie / kartu pelajar) dan semua foto
            kondisi barang akan dihapus permanen dalam satu aksi. Gunakan ini bila
            ada kesalahan upload — kamu bisa upload ulang setelahnya.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteOrderData}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="back" value={back} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
            <Button type="submit" variant="destructive">
              Ya, Hapus Semuanya
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
