"use client";

import { Pencil, Trash2 } from "lucide-react";
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
import { deleteCustomer, deleteDocument } from "@/actions/customers";

function DeleteCustomerDialogContent({
  customerId,
  customerName,
  orderCount,
}: {
  customerId: number;
  customerName: string;
  orderCount: number;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Hapus pelanggan {customerName}?</DialogTitle>
        <DialogDescription>
          Pelanggan beserta dokumen dan{" "}
          <span className="font-semibold">{orderCount} order</span> miliknya akan dihapus
          permanen. Aksi ini tidak bisa dibatalkan.
        </DialogDescription>
      </DialogHeader>
      <form action={deleteCustomer}>
        <input type="hidden" name="customerId" value={customerId} />
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
          <Button type="submit" variant="destructive">
            Ya, Hapus
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Tombol hapus pelanggan dengan dialog konfirmasi (dipakai di halaman detail). */
export function DeleteCustomerDialog({
  customerId,
  customerName,
  orderCount,
}: {
  customerId: number;
  customerName: string;
  orderCount: number;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="destructive" className="gap-1.5">
            <Trash2 className="size-4" aria-hidden />
            Hapus Pelanggan
          </Button>
        }
      />
      <DeleteCustomerDialogContent
        customerId={customerId}
        customerName={customerName}
        orderCount={orderCount}
      />
    </Dialog>
  );
}

/** Baris aksi per pelanggan di tabel list: hanya Hapus (admin only) —
 *  nama pelanggan sudah jadi link ke halaman edit/detail. */
export function CustomerRowActions({
  customerId,
  customerName,
  orderCount,
  isAdmin = false,
}: {
  customerId: number;
  customerName: string;
  orderCount: number;
  isAdmin?: boolean;
}) {
  if (!isAdmin) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog>
        <DialogTrigger
          render={
            <button
              type="button"
              aria-label={`Hapus ${customerName}`}
              title="Hapus pelanggan"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          }
        />
        <DeleteCustomerDialogContent
          customerId={customerId}
          customerName={customerName}
          orderCount={orderCount}
        />
      </Dialog>
    </div>
  );
}

/** Tombol hapus dokumen (per kartu dokumen). */
export function DeleteDocumentButton({
  documentId,
  customerId,
}: {
  documentId: number;
  customerId: number;
}) {
  return (
    <form action={deleteDocument}>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="customerId" value={customerId} />
      <button
        type="submit"
        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 transition-colors hover:text-red-700"
        onClick={(e) => {
          if (!window.confirm("Hapus dokumen ini?")) e.preventDefault();
        }}
      >
        <Trash2 className="size-3" aria-hidden />
        Hapus
      </button>
    </form>
  );
}
