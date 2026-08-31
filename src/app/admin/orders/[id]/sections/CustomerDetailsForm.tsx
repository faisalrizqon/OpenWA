"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateOrderFees } from "@/actions/orders";
import { GUARANTEE_TYPES } from "./constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/SelectField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const GUARANTEE_OPTIONS = [
  { value: "none", label: "— tanpa jaminan —" },
  ...Object.entries(GUARANTEE_TYPES).map(([value, label]) => ({ value, label })),
];

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "Ambil sendiri (pickup)" },
  { value: "courier", label: "Diantar kurir (COD)" },
];

/** Ikon edit di card Pelanggan & Aksi untuk mengubah data order. */
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-guarantee-type">Jenis Jaminan</Label>
              <SelectField
                id="customer-guarantee-type"
                name="guaranteeType"
                defaultValue={initialGuaranteeType ?? "none"}
                options={GUARANTEE_OPTIONS}
                triggerClassName="min-w-0 bg-background"
              />
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-delivery-mode">Metode Pengambilan</Label>
              <SelectField
                id="customer-delivery-mode"
                name="deliveryMode"
                defaultValue={initialDeliveryMode ?? "pickup"}
                options={DELIVERY_OPTIONS}
                triggerClassName="min-w-0 bg-background"
              />
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
