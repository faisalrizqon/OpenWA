"use client";

import { useState } from "react";
import { submitReturn } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
        <p className="text-sm text-zinc-500">Tidak ada unit ter-assign pada order ini.</p>
      ) : (
        <div className="space-y-3">
          {units.map((u) => (
            <div key={u.unitId} className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <span className="font-medium">{u.productName}</span>
                {u.serialNumber && (
                  <span className="ml-2 text-zinc-500">#{u.serialNumber}</span>
                )}
              </div>
              <div>
                <Label htmlFor={`cond-${u.unitId}`} className="sr-only">
                  Kondisi {u.productName}
                </Label>
                <select
                  id={`cond-${u.unitId}`}
                  value={conditions[u.unitId] ?? ""}
                  onChange={(e) =>
                    setConditions((prev) => ({ ...prev, [u.unitId]: e.target.value }))
                  }
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">— pilih kondisi —</option>
                  {Object.entries(CONDITIONS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
          className="text-sm"
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

      <Button type="submit" className="w-full" disabled={units.length === 0}>
        Selesaikan Order
      </Button>
    </form>
  );
}
