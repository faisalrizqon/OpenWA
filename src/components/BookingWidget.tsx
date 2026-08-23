"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import { formatRupiah, getTierPrice, type TieredProduct } from "@/lib/pricing";

interface BookingWidgetProps {
  productId: number;
  product: TieredProduct;
  prices: { label: string; hours: number; price: number }[];
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingWidget({ productId, product, prices }: BookingWidgetProps) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getTime() + 3600_000);
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  });
  const [durationHours, setDurationHours] = useState<number>(24);
  const [quantity, setQuantity] = useState<number>(1);
  const [available, setAvailable] = useState<number | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const start = new Date(startDate);
  const end = new Date(start.getTime() + durationHours * 3600_000);
  const validDate = !isNaN(start.getTime()) && start.getTime() >= now.getTime() - 60_000;

  // Cek ketersediaan setiap kali rentang berubah
  useEffect(() => {
    if (!validDate) {
      setAvailable(null);
      return;
    }
    let active = true;
    setChecking(true);
    const url = `/api/availability?productId=${productId}&start=${encodeURIComponent(
      start.toISOString()
    )}&end=${encodeURIComponent(end.toISOString())}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : { available: 0 }))
      .then((data: { available: number }) => {
        if (active) setAvailable(data.available);
      })
      .catch(() => {
        if (active) setAvailable(0);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, startDate, durationHours, validDate]);

  const unitPrice = validDate ? getTierPrice(product, durationHours) : 0;
  const total = unitPrice * quantity;
  const maxQty = available === null ? 99 : Math.max(0, available);

  const durationOptions = prices
    .filter((p) => p.price > 0)
    .map((p) => ({ label: `${p.label} — ${formatRupiah(p.price)}`, value: String(p.hours) }));

  const handleSubmit = () => {
    setError(null);
    if (!validDate) {
      setError("Pilih tanggal mulai sewa yang valid (tidak boleh di masa lalu).");
      return;
    }
    if (available !== null && available < quantity) {
      setError(`Hanya ${available} unit tersedia untuk tanggal tersebut.`);
      return;
    }
    setSubmitting(true);
    const params = new URLSearchParams({
      productId: String(productId),
      quantity: String(quantity),
      durationHours: String(durationHours),
      startDate: start.toISOString(),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <ShoppingBag className="size-4 text-primary" aria-hidden />
        Booking Sekarang
      </h3>

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="booking-start" className="mb-1.5 block text-sm">
            Tanggal & jam mulai sewa
          </Label>
          <input
            id="booking-start"
            type="datetime-local"
            value={startDate}
            min={toLocalInputValue(now)}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
          {validDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              Selesai: {end.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="booking-duration" className="mb-1.5 block text-sm">
            Durasi sewa
          </Label>
          <SelectField
            id="booking-duration"
            value={String(durationHours)}
            onValueChange={(v) => setDurationHours(Number(v))}
            options={durationOptions}
            placeholder="Pilih durasi"
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Jumlah</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Kurangi jumlah"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="size-4" aria-hidden />
            </Button>
            <span className="w-10 text-center text-base font-semibold tabular-nums">{quantity}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Tambah jumlah"
              onClick={() => setQuantity((q) => Math.min(Math.max(1, maxQty), q + 1))}
              disabled={available !== null && quantity >= available}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
            {checking ? (
              <span className="ml-1 text-xs text-muted-foreground">Memeriksa stok…</span>
            ) : available !== null ? (
              <span
                className={`ml-1 text-xs font-medium ${
                  available > 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {available > 0 ? `${available} unit tersedia` : "Tidak tersedia"}
              </span>
            ) : null}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>
        )}

        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Estimasi total</span>
          <span className="text-lg font-bold tabular-nums">{formatRupiah(total)}</span>
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || checking || !validDate || (available !== null && available === 0)}
        >
          Lanjut ke Pembayaran
        </Button>
      </div>
    </div>
  );
}
