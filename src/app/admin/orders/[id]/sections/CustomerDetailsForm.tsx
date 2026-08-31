"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateOrderFees } from "@/actions/orders";
import { GUARANTEE_TYPES } from "./constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Select component untuk guarantee type — match GUARANTEE_TYPES label. */
function GuaranteeSelect({
  id,
  value = "",
  onValueChange,
}: {
  id: string;
  value?: string | null;
  onValueChange: (v: string) => void;
}) {
  return (
    <select
      id={id}
      name="guaranteeType"
      value={value ?? ""}
      onChange={(e) => onValueChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
    >
      <option value="">— tanpa jaminan —</option>
      {Object.entries(GUARANTEE_TYPES).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

/** Ikon edit (pensil) di pojok kanan atas card Pelanggan & Aksi → buka dialog
 *  overlay berisi form data order: jenis & no. jaminan, metode pengambilan +
 *  alamat antar, dan catatan. */
export function CustomerDetailsForm({
  orderId,
  initialGuaranteeType,
  initialGuaranteeNumber,
  initialDeliveryMode,
  initialDeliveryAddress,
  initialNoteOrder,
}: {
  orderId: string;
  initialGuaranteeType: string | null;
  initialGuaranteeNumber: string | null;
  initialDeliveryMode: string | null;
  initialDeliveryAddress: string | null;
  initialNoteOrder: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [guaranteeNumber, setGuaranteeNumber] = useState(initialGuaranteeNumber ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryAddress ?? "");

  function resetAndClose() {
    setGuaranteeNumber(initialGuaranteeNumber ?? "");
    setDeliveryAddress(initialDeliveryAddress ?? "");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Edit Pelanggan & Aksi"
            title="Edit data pelanggan"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Pelanggan & Pengantaran</DialogTitle>
          <DialogDescription>
            Jaminan, metode antar/pickup, alamat, dan catatan order.
          </DialogDescription>
        </DialogHeader>

        <form action={updateOrderFees} onSubmit={() => setOpen(false)} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />

          {/* Jaminan */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-guarantee-type">Jenis Jaminan</Label>
              <select
                id="customer-guarantee-type"
                name="guaranteeType"
                defaultValue={initialGuaranteeType ?? ""}
                onChange={() => {}}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">— tanpa jaminan —</option>
                {Object.entries(GUARANTEE_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-guarantee-number">No. Jaminan</Label>
              <Input
                id="customer-guarantee-number"
                name="guaranteeNumber"
                value={guaranteeNumber}
                onChange={(e) => setGuaranteeNumber(e.target.value)}
                placeholder="mis. no. KTP / SIM"
              />
            </div>
          </div>

          {/* Pengantaran */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-delivery-mode">Metode Pengambilan</Label>
              <select
                id="customer-delivery-mode"
                name="deliveryMode"
                defaultValue={initialDeliveryMode ?? "pickup"}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="pickup">Ambil sendiri (pickup)</option>
                <option value="courier">Diantar kurir (COD)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-delivery-address">Alamat Antar</Label>
              <Input
                id="customer-delivery-address"
                name="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="mis. Weleri"
              />
            </div>
          </div>

          {/* Catatan order */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-note">Catatan Order</Label>
            <textarea
              id="customer-note"
              name="noteOrder"
              defaultValue={initialNoteOrder ?? ""}
              rows={3}
              placeholder="mis. Status: Book | Waktu: 19.00 WIB"
              className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Ongkos antar diatur lewat ikon edit pada card Ringkasan Pembayaran.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={resetAndClose} className="gap-1.5">
              <X className="size-3.5" aria-hidden />
              Batal
            </Button>
            <Button type="submit" size="sm" className="gap-1.5">
              <Save className="size-3.5" aria-hidden />
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
