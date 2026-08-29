"use client";

import * as React from "react";
import { ArrowRight, CalendarClock, Heart, MessageSquare, PackageCheck, Truck, User } from "lucide-react";
import { formatRupiah } from "@/lib/pricing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TIP_OPTIONS = [0, 2000, 5000, 10000];

interface CheckoutFormProps {
  itemsJson: string;
  productId: number;
  productName: string;
  quantity: number;
  durationHours: number;
  startIso: string;
  endIso: string;
  unitPrice: number;
  defaultCourierFee: number;
  action: (formData: FormData) => void;
  /** URL foto produk untuk preview di panel Ringkasan (opsional). */
  productImageUrl?: string;
}

export function CheckoutForm({
  itemsJson,
  productId,
  productName,
  quantity,
  durationHours,
  startIso,
  endIso,
  unitPrice,
  defaultCourierFee,
  action,
  productImageUrl,
}: CheckoutFormProps) {
  const [deliveryMode, setDeliveryMode] = React.useState<"pickup" | "courier">("pickup");
  const [courierFee, setCourierFee] = React.useState(defaultCourierFee);
  const [tip, setTip] = React.useState(0);
  const [customTip, setCustomTip] = React.useState("");

  const start = new Date(startIso);
  const end = new Date(endIso);
  const subtotal = Math.round(unitPrice * quantity);
  const fee = deliveryMode === "courier" && courierFee > 0 ? courierFee : 0;
  const effectiveTip = customTip.trim() !== "" ? Math.max(0, Number(customTip) || 0) : tip;
  const total = subtotal + fee + effectiveTip;

  const fmtDateTime = (d: Date) =>
    d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Data Pemesan</CardTitle>
          <CardDescription>
            Data ini dipakai untuk konfirmasi booking via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="items" value={itemsJson} />
            <input type="hidden" name="startDate" value={startIso} />
            <input type="hidden" name="deliveryMode" value={deliveryMode} />
            <input type="hidden" name="courierFee" value={fee} />
            <input type="hidden" name="tip" value={effectiveTip} />

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nama lengkap</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nama sesuai identitas"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">No. WhatsApp</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="08xxxxxxxxxx"
                required
                pattern="^0\d{8,13}$"
              />
              <p className="text-xs text-muted-foreground">Format 08xxx</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (opsional)</Label>
              <Input id="email" name="email" type="email" placeholder="nama@email.com" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                name="address"
                placeholder="Dipakai jika memilih diantar kurir"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Catatan (opsional)</Label>
              <textarea
                name="note"
                id="note"
                rows={3}
                className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                placeholder="Permintaan khusus…"
              />
            </div>

            {/* Metode pengantaran */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Metode Pengantaran</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-accent",
                    deliveryMode === "pickup" && "border-primary bg-primary/5"
                  )}
                >
                  <input
                    type="radio"
                    name="deliveryModeRadio"
                    checked={deliveryMode === "pickup"}
                    onChange={() => setDeliveryMode("pickup")}
                    className="size-4 accent-emerald-600"
                  />
                  Ambil sendiri
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-accent",
                    deliveryMode === "courier" && "border-primary bg-primary/5"
                  )}
                >
                  <input
                    type="radio"
                    name="deliveryModeRadio"
                    checked={deliveryMode === "courier"}
                    onChange={() => setDeliveryMode("courier")}
                    className="size-4 accent-emerald-600"
                  />
                  Diantar kurir
                </label>
              </div>

              {/* Biaya antar — hanya saat kurir dipilih, bisa dicustom */}
              {deliveryMode === "courier" && (
                <div className="mt-2 rounded-xl border bg-muted/40 p-3">
                  <Label htmlFor="courierFee" className="flex items-center gap-1.5">
                    <Truck className="size-3.5" aria-hidden />
                    Ongkos antar (bisa disesuaikan)
                  </Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Rp</span>
                    <Input
                      id="courierFee"
                      type="number"
                      min={0}
                      step={1000}
                      value={courierFee}
                      onChange={(e) => setCourierFee(Math.max(0, Number(e.target.value) || 0))}
                      className="max-w-40"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Default {formatRupiah(defaultCourierFee)} — sesuaikan dengan jarak / kesepakatan.
                  </p>
                </div>
              )}
            </div>

            {/* Tip */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <Heart className="size-3.5 text-rose-500" aria-hidden />
                Tip untuk kurir (opsional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {TIP_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTip(t);
                      setCustomTip("");
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      tip === t && customTip === ""
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent"
                    )}
                  >
                    {t === 0 ? "Tanpa tip" : formatRupiah(t)}
                  </button>
                ))}
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="Nominal lain…"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  className="w-36 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            {/* Kode promo — diskon dihitung & divalidasi server saat submit */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="promoCode">Kode Promo (opsional)</Label>
              <Input
                id="promoCode"
                name="promoCode"
                placeholder="mis. LEBARAN20"
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Kode aktif akan memotong total — dicek saat pesanan dibuat.
              </p>
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" className="h-11 w-full text-base">
                Buat Pesanan
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {productImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productImageUrl}
                  alt={productName}
                  className="size-14 shrink-0 rounded-xl border object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-xl font-bold">
                  ×{quantity}
                </span>
              )}
              <div>
                <p className="font-semibold leading-tight">{productName}</p>
                <p className="text-muted-foreground">{durationHours} jam sewa{quantity > 1 ? ` × ${quantity}` : ""}</p>
              </div>
            </div>

            <dl className="space-y-1.5 border-t pt-3">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Mulai</dt>
                <dd className="flex items-center gap-1 font-medium tabular-nums">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {fmtDateTime(start)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Selesai</dt>
                <dd className="flex items-center gap-1 font-medium tabular-nums">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {fmtDateTime(end)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Harga {durationHours} jam × {quantity}</dt>
                <dd className="font-medium tabular-nums">{formatRupiah(subtotal)}</dd>
              </div>
              {fee > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Ongkos antar</dt>
                  <dd className="font-medium tabular-nums">{formatRupiah(fee)}</dd>
                </div>
              )}
              {effectiveTip > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="size-3 text-rose-500" aria-hidden />
                    Tip
                  </dt>
                  <dd className="font-medium tabular-nums">{formatRupiah(effectiveTip)}</dd>
                </div>
              )}
            </dl>

            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold tabular-nums text-emerald-700">
                {formatRupiah(total)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-1.5">
            <PackageCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
            Stok dikunci sementara — admin mengonfirmasi ketersediaan unit.
          </p>
          <p className="flex items-start gap-1.5">
            <User className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
            Siapkan KTP / kartu pelajar sebagai jaminan saat pengambilan.
          </p>
          <p className="flex items-start gap-1.5">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
            Konfirmasi dikirim admin via WhatsApp pada jam operasional.
          </p>
        </div>
      </div>
    </div>
  );
}
