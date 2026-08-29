"use client";

import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { deleteProduct, toggleProductActive } from "@/actions/products";

/** Tombol hapus produk dengan dialog konfirmasi — dipakai di tabel & halaman detail. */
export function DeleteProductDialog({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="destructive" size="sm" className="gap-1.5">
            <Trash2 className="size-3.5" aria-hidden />
            Hapus Produk
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus produk {productName}?</DialogTitle>
          <DialogDescription>
            Produk beserta unit fisiknya akan dihapus permanen. Riwayat order lama
            tetap ada. Tidak bisa dilakukan jika masih ada order berjalan.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteProduct}>
          <input type="hidden" name="productId" value={productId} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
            <Button type="submit" variant="destructive">
              Ya, Hapus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Baris aksi per produk di tabel: Edit (link ke halaman detail) + Toggle aktif. */
export function ProductRowActions({
  productId,
  productName,
  active,
}: {
  productId: number;
  productName: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/products/${productId}`}
        aria-label={`Edit ${productName}`}
        title="Edit produk"
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Pencil className="size-3.5" aria-hidden />
      </Link>

      <form action={toggleProductActive}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="active" value={active ? "false" : "true"} />
        <button
          type="submit"
          aria-label={active ? "Nonaktifkan produk" : "Aktifkan produk"}
          title={active ? "Sembunyikan dari katalog" : "Tampilkan di katalog"}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {active ? (
            <EyeOff className="size-3.5" aria-hidden />
          ) : (
            <Eye className="size-3.5" aria-hidden />
          )}
        </button>
      </form>
    </div>
  );
}
