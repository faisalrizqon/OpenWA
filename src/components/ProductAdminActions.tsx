"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

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
import { Menu, MenuContent, MenuItem, MenuLinkItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { deleteProduct, toggleProductActive } from "@/actions/products";

/** Tombol hapus produk dengan dialog konfirmasi, dipakai di tabel dan halaman detail. */
export function DeleteProductDialog({ productId, productName }: { productId: number; productName: string }) {
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
            Produk beserta unit fisiknya akan dihapus permanen. Riwayat order lama tetap ada. Tidak bisa dilakukan jika masih ada order berjalan.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteProduct}>
          <input type="hidden" name="productId" value={productId} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
            <Button type="submit" variant="destructive">Ya, Hapus</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Kebab menu dropdown per produk: Edit, Toggle aktif/nonaktif, Hapus. */
export function ProductRowActions({ productId, productName, active }: { productId: number; productName: string; active: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = () => {
    setIsOpen(false);
    const formData = new FormData();
    formData.set("productId", String(productId));
    formData.set("active", active ? "false" : "true");
    startTransition(() => {
      void toggleProductActive(formData);
    });
  };

  return (
    <>
      <Menu open={isOpen} onOpenChange={setIsOpen}>
        <MenuTrigger aria-label={`Buka menu aksi ${productName}`}>
          <MoreVertical className="size-4" aria-hidden />
          <span className="sr-only">Buka menu aksi produk</span>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuLinkItem href={`/admin/products/${productId}`} closeOnClick>
            <Pencil aria-hidden />
            Edit produk
          </MenuLinkItem>
          <MenuSeparator />
          <MenuItem onClick={handleToggleActive} disabled={isPending}>
            {active ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {active ? "Sembunyikan dari katalog" : "Tampilkan di katalog"}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            onClick={() => {
              setIsOpen(false);
              setDeleteOpen(true);
            }}
            className="text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700"
          >
            <Trash2 aria-hidden />
            Hapus produk
          </MenuItem>
        </MenuContent>
      </Menu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus produk {productName}?</DialogTitle>
            <DialogDescription>
              Produk beserta unit fisiknya akan dihapus permanen. Riwayat order lama tetap ada. Tidak bisa dilakukan jika masih ada order berjalan.
            </DialogDescription>
          </DialogHeader>
          <form action={deleteProduct}>
            <input type="hidden" name="productId" value={productId} />
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
              <Button type="submit" variant="destructive">Ya, Hapus</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
