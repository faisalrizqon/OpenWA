"use client";

import { useState } from "react";
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
import { UploadField } from "@/components/UploadField";
import { deleteOrder, editPayment, deletePayment, updateOrderStatus } from "@/actions/orders";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

export const METHOD_OPTIONS = [
  { label: "—", value: "" },
  { label: "Cash", value: "cash" },
  { label: "QRIS", value: "qris" },
  { label: "Transfer Bank", value: "transfer" },
];

export const PAYMENT_TYPE_OPTIONS = [
  { label: "DP", value: "dp" },
  { label: "Pelunasan", value: "pelunasan" },
  { label: "Denda", value: "denda" },
];
const STATUS_OPTIONS = [
  { label: <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-amber-400" />Menunggu Konfirmasi</span>, value: "pending" },
  { label: <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-blue-500" />Booking</span>, value: "booking" },
  { label: <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" />Aktif</span>, value: "active" },
  { label: <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-rose-500" />Terlambat</span>, value: "late" },
  { label: <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-green-500" />Selesai</span>, value: "completed" },
  { label: <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-slate-400" />Dibatalkan</span>, value: "cancelled" },
];

/**
 * Picker status order — perubahan ditampung sebagai draft dan baru masuk DB
 * saat tombol "Simpan" di header ditekan (lihat OrderDraftSaveBar).
 *
 * Bila dipakai di luar OrderDraftProvider, komponen tetap jalan dengan mode
 * langsung-submit supaya tidak merusak pemakaian lain.
 */
export function StatusChangeForm({ orderId, status }: { orderId: string; status: string }) {
  const draft = useOptionalOrderDraft();

  // Tanpa provider (mis. halaman lain) → perilaku lama: submit langsung.
  if (!draft) {
    return (
      <form id="order-status-form" action={updateOrderStatus} className="min-w-0">
        <input type="hidden" name="orderId" value={orderId} />
        <SelectField
          name="newStatus"
          defaultValue={status}
          options={STATUS_OPTIONS}
          triggerClassName="h-8 w-auto min-w-[180px] rounded-full border-slate-200 bg-background px-3 text-sm shadow-none"
          className="min-w-[240px] max-h-none overflow-y-visible rounded-xl border-slate-200 bg-popover p-1 shadow-lg"
        />
      </form>
    );
  }

  return (
    <div className="min-w-0">
      <SelectField
        value={draft.status ?? status}
        onValueChange={(v) => draft.setStatus(v === status ? null : v)}
        options={STATUS_OPTIONS}
        triggerClassName="h-8 w-auto min-w-[180px] rounded-full border-slate-200 bg-background px-3 text-sm shadow-none"
        className="min-w-[240px] max-h-none overflow-y-visible rounded-xl border-slate-200 bg-popover p-1 shadow-lg"
      />
    </div>
  );
}
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

/** Aksi per baris pembayaran: edit (dialog draft) & hapus (konfirmasi draft). */
export function PaymentRowActions({
  payment,
  isAdmin = false,
}: {
  payment: {
    id: number;
    paymentType: string;
    amount: number;
    method: string | null;
    note: string | null;
    status: string;
  };
  isAdmin?: boolean;
}) {
  const draft = useOptionalOrderDraft();

  // Nilai yang sedang diedit — diawali dari draft (bila sudah ada), lalu dari DB.
  const staged = draft?.paymentsToEdit.find((p) => p.paymentId === payment.id);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(staged?.amount ?? payment.amount));
  const [paymentType, setPaymentType] = useState(staged?.paymentType ?? payment.paymentType);
  const [method, setMethod] = useState(staged?.method ?? payment.method ?? "");
  const [note, setNote] = useState(staged?.note ?? payment.note ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  function syncFromSource() {
    const current = draft?.paymentsToEdit.find((p) => p.paymentId === payment.id);
    setAmount(String(current?.amount ?? payment.amount));
    setPaymentType(current?.paymentType ?? payment.paymentType);
    setMethod(current?.method ?? payment.method ?? "");
    setNote(current?.note ?? payment.note ?? "");
    setProofFile(null);
    setError("");
  }

  function applyEdit() {
    if (!draft) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    draft.editPayment({
      paymentId: payment.id,
      amount: parsed,
      paymentType,
      method,
      note,
      proof: proofFile,
    });
    setOpen(false);
  }

  function confirmDelete() {
    draft?.deletePayment(payment.id);
  }

  // Tanpa provider → tidak ada aksi (halaman non-draft tidak memakai komponen ini).
  if (!draft) return null;

  const isStagedDeleted = draft.paymentsToDelete.includes(payment.id);

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) syncFromSource();
          setOpen(next);
        }}
      >
        <DialogTrigger
          render={
            <button
              type="button"
              aria-label="Edit pembayaran"
              disabled={isStagedDeleted}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pembayaran</DialogTitle>
            <DialogDescription>
              Koreksi jenis, nominal, metode, atau catatan. Perubahan baru tersimpan
              setelah tombol <strong>Simpan</strong> ditekan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Jenis</label>
              <SelectField
                value={paymentType}
                onValueChange={setPaymentType}
                options={PAYMENT_TYPE_OPTIONS}
                triggerClassName="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-none"
                className="min-w-[140px] max-h-none overflow-y-visible rounded-xl border-slate-200 bg-popover p-1 shadow-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Jumlah (Rp)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Metode</label>
              <SelectField
                value={method}
                onValueChange={setMethod}
                options={METHOD_OPTIONS}
                triggerClassName="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-none"
                className="min-w-[140px] max-h-none overflow-y-visible rounded-xl border-slate-200 bg-popover p-1 shadow-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Catatan</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Ganti Bukti Transfer (opsional)
              </label>
              <UploadField
                id={`proof-${payment.id}`}
                name="proof"
                compact
                placeholder="Pilih file bukti…"
                onFilesChange={(files: File[]) => setProofFile(files[0] ?? null)}
              />
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={syncFromSource}>
                Buang perubahan
              </Button>
              <Button type="button" onClick={applyEdit}>
                Terapkan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <Dialog>
          <DialogTrigger
            render={
              <button
                type="button"
                aria-label="Hapus pembayaran"
                disabled={isStagedDeleted}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus pembayaran ini?</DialogTitle>
              <DialogDescription>
                Penghapusan baru dijalankan setelah tombol <strong>Simpan</strong>{" "}
                ditekan. Sampai saat itu baris hanya ditandai.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
              <DialogClose
                render={
                  <Button type="button" variant="destructive" onClick={confirmDelete}>
                    Tandai Hapus
                  </Button>
                }
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
