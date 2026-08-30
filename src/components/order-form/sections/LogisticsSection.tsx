"use client";

import { ShieldCheck } from "lucide-react";
import { SelectField } from "@/components/SelectField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface LogisticsSectionProps {
  guaranteeType: string;
  setGuaranteeType: (value: string) => void;
  guaranteeNumber: string;
  setGuaranteeNumber: (value: string) => void;
  deliveryMode: string;
  setDeliveryMode: (value: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (value: string) => void;
  courierFee: number;
  setCourierFee: (value: number) => void;
}

/** Guarantee & logistics section. */
export function LogisticsSection({
  guaranteeType,
  setGuaranteeType,
  guaranteeNumber,
  setGuaranteeNumber,
  deliveryMode,
  setDeliveryMode,
  deliveryAddress,
  setDeliveryAddress,
  courierFee,
  setCourierFee,
}: LogisticsSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <ShieldCheck className="size-3.5" aria-hidden />
        </span>
        Jaminan & Logistik
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="guaranteeType">Jaminan</Label>
          <SelectField
            id="guaranteeType"
            name="guaranteeType"
            value={guaranteeType}
            onValueChange={setGuaranteeType}
            options={[
              { label: "— tanpa jaminan —", value: "" },
              { label: "KTP", value: "ktp" },
              { label: "SIM", value: "sim" },
              { label: "Kartu Pelajar", value: "kartu_pelajar" },
              { label: "Lainnya", value: "lainnya" },
            ]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guaranteeNumber">No. Jaminan (opsional)</Label>
          <Input
            id="guaranteeNumber"
            name="guaranteeNumber"
            value={guaranteeNumber}
            onChange={(e) => setGuaranteeNumber(e.target.value)}
            placeholder="mis. no. KTP / SIM"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryMode">Metode Pengambilan</Label>
          <SelectField
            id="deliveryMode"
            name="deliveryMode"
            value={deliveryMode}
            onValueChange={setDeliveryMode}
            options={[
              { label: "Ambil sendiri (pickup)", value: "pickup" },
              { label: "Diantar kurir (COD)", value: "courier" },
            ]}
          />
        </div>
        {deliveryMode === "courier" && (
          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Alamat Antar</Label>
            <Input
              id="deliveryAddress"
              name="deliveryAddress"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="mis. Weleri"
            />
          </div>
        )}
        {deliveryMode === "courier" && (
          <div className="space-y-2">
            <Label htmlFor="courierFee">Gaji Transport Kurir (Rp)</Label>
            <Input
              id="courierFee"
              name="courierFee"
              type="number"
              min={0}
              value={courierFee}
              onChange={(e) => setCourierFee(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        )}
      </div>
    </section>
  );
}
