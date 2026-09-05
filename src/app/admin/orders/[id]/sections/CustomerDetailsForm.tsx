"use client";

import { useState } from "react";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { GUARANTEE_TYPES } from "./constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOrderDraft } from "@/components/order-draft/OrderDraftContext";

const GUARANTEE_OPTIONS = [
  { value: "none", label: "— tanpa jaminan —" },
  ...Object.entries(GUARANTEE_TYPES).map(([value, label]) => ({ value, label })),
];

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "Ambil sendiri (pickup)" },
  { value: "courier", label: "Diantar kurir (COD)" },
];

/** Ikon edit di card Pelanggan & Aksi. Perubahan disimpan ke draft context. */
export function CustomerDetailsForm({
  initialGuaranteeType,
  initialGuaranteeNumber,
  initialDeliveryMode,
  initialDeliveryAddress,
  initialNoteOrder,
}: {
  initialGuaranteeType: string | null;
  initialGuaranteeNumber: string | null;
  initialDeliveryMode: string | null;
  initialDeliveryAddress: string | null;
  initialNoteOrder: string | null;
}) {
  const { details, setDetails } = useOrderDraft();

  const [open, setOpen] = useState(false);
  const [guaranteeType, setGuaranteeType] = useState(details?.guaranteeType !== undefined ? (details.guaranteeType ?? "none") : (initialGuaranteeType ?? "none"));
  const [guaranteeNumber, setGuaranteeNumber] = useState(details?.guaranteeNumber !== undefined ? (details.guaranteeNumber ?? "") : (initialGuaranteeNumber ?? ""));
  const [deliveryMode, setDeliveryMode] = useState(details?.deliveryMode !== undefined ? (details.deliveryMode ?? "pickup") : (initialDeliveryMode ?? "pickup"));
  const [deliveryAddress, setDeliveryAddress] = useState(details?.deliveryAddress !== undefined ? (details.deliveryAddress ?? "") : (initialDeliveryAddress ?? ""));
  const [noteOrder, setNoteOrder] = useState(details?.noteOrder !== undefined ? (details.noteOrder ?? "") : (initialNoteOrder ?? ""));

  function revertToDraft() {
    setGuaranteeType(details?.guaranteeType !== undefined ? (details.guaranteeType ?? "none") : (initialGuaranteeType ?? "none"));
    setGuaranteeNumber(details?.guaranteeNumber !== undefined ? (details.guaranteeNumber ?? "") : (initialGuaranteeNumber ?? ""));
    setDeliveryMode(details?.deliveryMode !== undefined ? (details.deliveryMode ?? "pickup") : (initialDeliveryMode ?? "pickup"));
    setDeliveryAddress(details?.deliveryAddress !== undefined ? (details.deliveryAddress ?? "") : (initialDeliveryAddress ?? ""));
    setNoteOrder(details?.noteOrder !== undefined ? (details.noteOrder ?? "") : (initialNoteOrder ?? ""));
  }

  function applyToDraft() {
    setDetails({
      guaranteeType: guaranteeType === "none" ? null : guaranteeType,
      guaranteeNumber: guaranteeNumber.trim(),
      deliveryMode,
      deliveryAddress: deliveryMode === "courier" ? deliveryAddress.trim() : null,
      noteOrder: noteOrder.trim(),
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) revertToDraft();
      setOpen(next);
    }}>
      <DialogTrigger render={<button type="button" aria-label="Edit data pelanggan" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10"><Pencil className="size-4" /></button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Pelanggan & Pengantaran</DialogTitle>
          <DialogDescription>Perubahan baru tersimpan setelah tombol Simpan Perubahan di bawah halaman ditekan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-guarantee-type">Jenis Jaminan</Label>
              <SelectField id="customer-guarantee-type" value={guaranteeType} onValueChange={setGuaranteeType} options={GUARANTEE_OPTIONS} triggerClassName="min-w-0 bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-guarantee-number">No. Jaminan</Label>
              <Input id="customer-guarantee-number" value={guaranteeNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuaranteeNumber(e.target.value)} placeholder="mis. no. KTP / SIM" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-delivery-mode">Metode Pengambilan</Label>
              <SelectField id="customer-delivery-mode" value={deliveryMode} onValueChange={setDeliveryMode} options={DELIVERY_OPTIONS} triggerClassName="min-w-0 bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-delivery-address">Alamat Antar</Label>
              <Input id="customer-delivery-address" value={deliveryAddress} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliveryAddress(e.target.value)} placeholder="mis. Weleri" disabled={deliveryMode !== "courier"} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-note">Catatan Order</Label>
            <textarea id="customer-note" value={noteOrder} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteOrder(e.target.value)} rows={3} placeholder="mis. Status: Book | Waktu: 19.00 WIB" className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">Ongkos antar diatur lewat ikon edit pada card Ringkasan Pembayaran.</p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={revertToDraft} className="gap-1.5"><RotateCcw className="size-3.5" /> Buang perubahan</Button>
            <Button type="button" size="sm" onClick={applyToDraft} className="gap-1.5"><Check className="size-3.5" /> Terapkan</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
