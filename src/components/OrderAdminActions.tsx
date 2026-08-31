"use client";

import { Pencil, Trash2 } from "lucide-react";
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
import { SelectField } from "@/components/SelectField";
import {
  deleteOrder,
  editPayment,
  deletePayment,
} from "@/actions/orders";

export const METHOD_OPTIONS = [
  { label: "—", value: "" },
  { label: "Cash", value: "cash" },
  { label: "QRIS", value: "qris" },
  { label: "Transfer Bank", value: "transfer" },
];

/** Tombol hapus order dengan dialog konfirmasi. */
export function DeleteOrderDialog({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="destructive" size="sm" className="gap-1.5">
            <Trash2 className="size-3.5" aria-hidden />
            Hapus Order
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus order {orderNumber}?</DialogTitle>
          <DialogDescription>
            Order beserta item dan riwayat pembayarannya akan dihapus permanen. Unit
            yang masih tercatat akan dilepas kembali ke stok.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteOrder}>
          <input type="hidden" name="orderId" value={orderId} />
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

/** Aksi per baris pembayaran: edit (dialog) & hapus (konfirm). */
export function PaymentRowActions({
  orderId,
  payment,
  isAdmin = false,
}: {
  orderId: string;
  payment: {
    id: number;
    amount: number;
    method: string | null;
    note: string | null;
    status: string;
  };
  isAdmin?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog>
        <DialogTrigger
          render={
            <button
              type="button"
              aria-label="Edit pembayaran"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pembayaran</DialogTitle>
            <DialogDescription>
              Koreksi nominal, metode, atau catatan pembayaran.
            </DialogDescription>
          </DialogHeader>
          <form action={editPayment} className="space-y-3">
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="orderId" value={orderId} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Jumlah (Rp)</label>
              <input
                name="amount"
                type="number"
                min="1"
                required
                defaultValue={payment.amount}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Metode</label>
              <SelectField
                name="method"
                defaultValue={payment.method ?? ""}
                options={METHOD_OPTIONS}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Catatan</label>
              <input
                name="note"
                defaultValue={payment.note ?? ""}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Ganti Bukti Transfer (maks 15MB, dikompres otomatis)
              </label>
              <input
                name="proof"
                type="file"
                accept="*/*"
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-muted file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Kosongkan jika ingin hapus bukti yang sudah ada
              </p>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <form action={deletePayment}>
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            aria-label="Hapus pembayaran"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
