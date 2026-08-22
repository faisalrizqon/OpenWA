"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitReturn } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";

interface ReturnUnit {
  unitId: number;
  productName: string;
  serialNumber: string | null;
}

const CONDITIONS: Record<string, string> = {
  Bagus: "Bagus",
  Cukup: "Cukup",
  Rusak: "Rusak",
};

export function ReturnForm({ orderId, units }: { orderId: string; units: ReturnUnit[] }) {
  const [conditions, setConditions] = useState<Record<number, string>>({});

  const conditionsJson = JSON.stringify(
    units
      .filter((u) => conditions[u.unitId])
      .map((u) => ({ unitId: u.unitId, condition: conditions[u.unitId] }))
  );

  return (
    <form action={submitReturn} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="conditions" value={conditionsJson} />

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada unit ter-assign pada order ini.</p>
      ) : (
        <div className="space-y-3">
          {units.map((u) => (
            <div
              key={u.unitId}
              className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">{u.productName}</span>
                {u.serialNumber && (
                  <span className="ml-2 text-muted-foreground">#{u.serialNumber}</span>
                )}
              </div>
              <div className="w-40">
                <Label htmlFor={`cond-${u.unitId}`} className="sr-only">
                  Kondisi {u.productName}
                </Label>
                <SelectField
                  id={`cond-${u.unitId}`}
                  value={conditions[u.unitId] || undefined}
                  onValueChange={(v) =>
                    setConditions((prev) => ({ ...prev, [u.unitId]: v }))
                  }
                  placeholder="— pilih kondisi —"
                  options={Object.entries(CONDITIONS).map(([value, label]) => ({
                    label,
                    value,
                  }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="photos">Foto Return (opsional, bisa banyak)</Label>
        <input
          id="photos"
          name="photos"
          type="file"
          multiple
          accept="image/*"
          className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground hover:file:bg-accent/80"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan (opsional)</Label>
        <textarea
          id="notes"
          name="notes"
          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" className="w-full gap-1.5" disabled={units.length === 0}>
        <CheckCircle2 className="size-4" aria-hidden />
        Selesaikan Order
      </Button>
    </form>
  );
}
