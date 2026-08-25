"use client";

import * as React from "react";
import { CheckCircle2, Upload, X } from "lucide-react";
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
  const [conditions, setConditions] = React.useState<Record<number, string>>({});
  const [files, setFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const conditionsJson = JSON.stringify(
    units
      .filter((u) => conditions[u.unitId])
      .map((u) => ({ unitId: u.unitId, condition: conditions[u.unitId] }))
  );

  // Tambah file ke akumulasi, lalu kosongkan input agar file yang sama
  // bisa dipilih lagi (input native tidak memicu onChange jika value sama).
  const addFiles = (picked: FileList | null) => {
    if (!picked) return;
    setFiles((prev) => [...prev, ...Array.from(picked)]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Tepat sebelum submit native, muat file yang terakumulasi ke input
  // lewat DataTransfer — dengan begitu file yang dipilih (dan belum
  // dihapus) benar-benar ikut terkirim. Tidak preventDefault: submit
  // native/server-action tetap berjalan.
  const handleSubmit = () => {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
  };

  return (
    <form action={submitReturn} onSubmit={handleSubmit} className="space-y-4">
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

      {/* Foto kondisi barang — kotak upload bergaya, konsisten dengan upload jaminan */}
      <div className="space-y-1.5">
        <Label htmlFor="photos">Foto kondisi barang (opsional, bisa banyak)</Label>
        <label
          htmlFor="photos"
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <Upload className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            {files.length > 0
              ? `${files.length} foto dipilih — klik untuk menambah`
              : "Pilih foto kondisi barang…"}
          </span>
        </label>
        <input
          ref={inputRef}
          id="photos"
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
        {/* Preview + hapus per file terpilih (sebelum submit) */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex max-w-44 items-center gap-1.5 rounded-lg border bg-card px-2 py-1 text-xs"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Hapus ${f.name} dari pilihan`}
                  onClick={() => removeFile(i)}
                  className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">JPG/PNG/WebP, maksimal 5 MB per foto.</p>
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
