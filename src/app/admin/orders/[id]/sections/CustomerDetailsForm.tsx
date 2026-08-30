"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateOrderFees } from "@/actions/orders";
import { GUARANTEE_TYPES } from "./constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface GuaranteeSelectProps {
  id: string;
  value?: string | null;
  onValueChange: (v: string) => void;
}

/** Select component untuk guarantee type — match GUARANTEE_TYPES label. */
export function GuaranteeSelect({ id, value = "", onValueChange }: GuaranteeSelectProps) {
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

/** Form inline untuk edit data pelanggan/order di card Pelanggan & Aksi.
 *  Pola sama dengan FeesEditForm / ItemPricesForm. */
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
  const [guaranteeType, setGuaranteeType] = useState(initialGuaranteeType ?? "");
  const [guaranteeNumber, setGuaranteeNumber] = useState(initialGuaranteeNumber ?? "");
  const [deliveryMode, setDeliveryMode] = useState(initialDeliveryMode ?? "pickup");
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryAddress ?? "");
  const [noteOrder, setNoteOrder] = useState(initialNoteOrder ?? "");

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Pencil className="size-3.5" aria-hidden />
        Edit Data Pelanggan
      </Button>
    );
  }

  return (
    <form
      action={updateOrderFees}
      className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="orderId" value={orderId} />

      {/* Jaminan */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="customer-guarantee-type">Jenis Jaminan</Label>
          <GuaranteeSelect
            id="customer-guarantee-type"
            value={guaranteeType}
            onValueChange={setGuaranteeType}
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

      {/* Pengantaran */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="customer-delivery-mode">Metode Pengambilan</Label>
          <select
            id="customer-delivery-mode"
            name="deliveryMode"
            value={deliveryMode}
            onChange={(e) => setDeliveryMode(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="pickup">Ambil sendiri (pickup)</option>
            <option value="courier">Diantar kurir (COD)</option>
          </select>
        </div>
        {deliveryMode === "courier" && (
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
        )}
      </div>

      {/* Catatan order */}
      <div className="space-y-1.5">
        <Label htmlFor="customer-note">Catatan Order</Label>
        <textarea
          id="customer-note"
          name="noteOrder"
          value={noteOrder}
          onChange={(e) => setNoteOrder(e.target.value)}
          rows={3}
          className="min-h-16 w-full rounded-lg border border-input bg-background px-3 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="gap-1.5">
          <Save className="size-3.5" aria-hidden />
          Simpan
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setGuaranteeType(initialGuaranteeType ?? "");
            setGuaranteeNumber(initialGuaranteeNumber ?? "");
            setDeliveryMode(initialDeliveryMode ?? "pickup");
            setDeliveryAddress(initialDeliveryAddress ?? "");
            setNoteOrder(initialNoteOrder ?? "");
            setOpen(false);
          }}
          className="gap-1.5"
        >
          <X className="size-3.5" aria-hidden />
          Batal
        </Button>
      </div>
    </form>
  );
}
