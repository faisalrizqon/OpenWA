"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Package,
  Plus,
  Trash2,
  User,
  Phone,
  CalendarClock,
  ListPlus,
  ShieldCheck,
  ClipboardPaste,
  Wand2,
} from "lucide-react";
import { createOrder } from "@/actions/orders";
import { getTierPrice, calcSubtotal, formatRupiah } from "@/lib/pricing";
import { parseBookingMessage, matchProduct, type ParsedBooking } from "@/lib/parseBooking";
import { SelectField } from "@/components/SelectField";
import { DateTimePicker, DatePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
interface ProductOption {
  id: number;
  name: string;
  sku: string;
  price6h: number;
  price12h: number;
  price24h: number;
  price48h: number;
  availableUnits: number;
}

interface CustomerOption {
  id: number;
  name: string;
  phone: string;
  isBlacklisted: boolean;
}

interface ItemDraft {
  key: number;
  productId: number;
  quantity: number;
  durationHours: number;
  unitPriceOverride: string;
  discountType: "none" | "amount" | "percent";
  discountValue: string;
}

const DURATIONS = [6, 12, 24, 48, 72, 96];

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function OrderForm({
  products,
  customers,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const now = useMemo(() => new Date(), []);
  const plus24h = useMemo(() => new Date(now.getTime() + 24 * 3600_000), [now]);

  const [customerId, setCustomerId] = useState<string>(
    customers.length > 0 ? String(customers[0].id) : "new"
  );
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [startDate, setStartDate] = useState(toLocalInputValue(now));
  const [rescheduledFrom, setRescheduledFrom] = useState("");
  const [guaranteeType, setGuaranteeType] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("pickup");
  const [guaranteeNumber, setGuaranteeNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waParsed, setWaParsed] = useState<ParsedBooking | null>(null);
  const [items, setItems] = useState<ItemDraft[]>(() =>
    products.length > 0
      ? [
          {
            key: 1,
            productId: products[0].id,
            quantity: 1,
            durationHours: 24,
            unitPriceOverride: "",
            discountType: "none",
            discountValue: "",
          },
        ]
      : []
  );

  const selectedCustomer = customers.find((c) => String(c.id) === customerId);

  // Availability check per unique product in items
  const [availability, setAvailability] = useState<Record<number, number>>({});

  const uniqueProductIds = useMemo(
    () => Array.from(new Set(items.map((it) => it.productId))),
    [items]
  );

  useEffect(() => {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return;
    let cancelled = false;
    const maxHours = Math.max(1, ...items.map((it) => it.durationHours));
    const end = new Date(start.getTime() + maxHours * 3600_000);

    (async () => {
      const entries = await Promise.all(
        uniqueProductIds.map(async (pid) => {
          try {
            const res = await fetch(
              `/api/availability?productId=${pid}&start=${encodeURIComponent(
                start.toISOString()
              )}&end=${encodeURIComponent(end.toISOString())}`
            );
            const json = (await res.json()) as { available: number };
            return [pid, json.available] as const;
          } catch {
            return [pid, 0] as const;
          }
        })
      );
      if (!cancelled) {
        setAvailability((prev) => {
          const next = { ...prev };
          for (const [pid, avail] of entries) next[pid] = avail;
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uniqueProductIds, startDate, items, JSON.stringify(items.map((i) => i.durationHours))]);

  const pricedItems = items.map((it) => {
    const product = products.find((p) => p.id === it.productId);
    const override = it.unitPriceOverride.trim() === "" ? null : Number(it.unitPriceOverride);
    const unitPrice =
      product && (override === null || isNaN(override))
        ? getTierPrice(product, it.durationHours)
        : (override ?? 0);
    const discountValue = it.discountValue.trim() === "" ? 0 : Number(it.discountValue) || 0;
    const subtotal = calcSubtotal({
      unitPrice,
      quantity: it.quantity,
      discountType: it.discountType === "none" ? null : it.discountType,
      discountValue,
    });
    return { item: it, product, unitPrice, subtotal };
  });

  const total = pricedItems.reduce((s, p) => s + p.subtotal, 0);

  const stockErrors = useMemo(() => {
    const errors: string[] = [];
    for (const pid of uniqueProductIds) {
      const product = products.find((p) => p.id === pid);
      if (!product) continue;
      const needed = items
        .filter((it) => it.productId === pid)
        .reduce((s, it) => s + it.quantity, 0);
      const available = availability[pid];
      if (available !== undefined && needed > available) {
        errors.push(`Stok tidak cukup untuk ${product.name}`);
      }
    }
    return errors;
  }, [uniqueProductIds, items, availability, products]);

  const customerValid =
    customerId !== "new" || (newName.trim().length > 0 && /^0\d{8,13}$/.test(newPhone.trim()));

  const canSubmit =
    items.length > 0 && stockErrors.length === 0 && customerValid && !selectedCustomer?.isBlacklisted;

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: Date.now(),
        productId: products[0]?.id ?? 0,
        quantity: 1,
        durationHours: 24,
        unitPriceOverride: "",
        discountType: "none",
        discountValue: "",
      },
    ]);
  }

  function updateItem(key: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  /** Isi form otomatis dari pesan booking WA yang ditempel. */
  function applyBookingMessage() {
    const parsed = parseBookingMessage(waMessage);
    setWaParsed(parsed);

    if (parsed.nama) {
      // cocokkan pelanggan existing (case-insensitive) atau siapkan pelanggan baru
      const existing = customers.find(
        (c) => c.name.toLowerCase() === parsed.nama!.toLowerCase()
      );
      if (existing) {
        setCustomerId(String(existing.id));
      } else {
        setCustomerId("new");
        setNewName(parsed.nama);
      }
    }

    if (parsed.kamera) {
      const productId = matchProduct(parsed.kamera, products);
      if (productId) {
        setItems((prev) => prev.map((it) => ({ ...it, productId })));
      }
    }

    if (parsed.durasiJam) {
      const dur = DURATIONS.includes(parsed.durasiJam)
        ? parsed.durasiJam
        : DURATIONS.find((d) => d >= parsed.durasiJam!) ?? 96;
      setItems((prev) => prev.map((it) => ({ ...it, durationHours: dur })));
    }

    if (parsed.jaminan) setGuaranteeType(parsed.jaminan);
    if (parsed.lokasiCod) {
      setDeliveryMode("courier");
      setDeliveryAddress(parsed.lokasiCod);
    }
    if (parsed.tanggal) setStartDate(toLocalInputValue(parsed.tanggal));
  }

  return (
    <form action={createOrder} className="space-y-6">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          pricedItems.map((p) => ({
            productId: p.item.productId,
            quantity: p.item.quantity,
            durationHours: p.item.durationHours,
            unitPrice: p.unitPrice,
            discountType: p.item.discountType === "none" ? null : p.item.discountType,
            discountValue:
              p.item.discountValue.trim() === "" ? 0 : Number(p.item.discountValue) || 0,
          }))
        )}
      />

      {/* Import pesan WA */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <ClipboardPaste className="size-3.5" aria-hidden />
          </span>
          Import Pesan Booking WA (opsional)
        </h2>
        <textarea
          value={waMessage}
          onChange={(e) => setWaMessage(e.target.value)}
          placeholder={`Tempel pesan booking di sini, mis:\nNama Penyewa : maya okta\nJenis Kamera : canon ps a4000\nDurasi (berapa hari) : 6jam\nJaminan (KTP/SIM) : ktp\nLokasi COD : Weleri\nTanggal Booking/Sewa : 23 agustus 2026,minggu`}
          className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={applyBookingMessage}
            disabled={waMessage.trim().length === 0}
            className="gap-1.5"
          >
            <Wand2 className="size-4" aria-hidden />
            Isi Otomatis
          </Button>
          {waParsed && (
            <p className="text-xs text-muted-foreground">
              ✓ Terbaca: {waParsed.nama ?? "—"} · {waParsed.kamera ?? "—"} ·{" "}
              {waParsed.durasiJam ? `${waParsed.durasiJam} jam` : "—"} ·{" "}
              {waParsed.tanggal
                ? format(waParsed.tanggal, "dd MMM yyyy", { locale: localeId })
                : "—"}
            </p>
          )}
        </div>
      </section>
      {/* Customer */}
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <User className="size-3.5" aria-hidden />
          </span>
          Pelanggan
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerId">Pilih Pelanggan</Label>
            <SelectField
              id="customerId"
              name="customerId"
              value={customerId}
              onValueChange={setCustomerId}
              options={[
                ...customers.map((c) => ({
                  label: `${c.name} (${c.phone})${c.isBlacklisted ? " — BLACKLIST" : ""}`,
                  value: String(c.id),
                })),
                { label: "+ Pelanggan baru", value: "new" },
              ]}
            />
            {/* Nomor HP pelanggan terpilih — selalu terlihat jelas */}
            {customerId !== "new" && selectedCustomer && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="font-medium">{selectedCustomer.name}</span>
                <span className="font-mono text-muted-foreground">{selectedCustomer.phone}</span>
              </div>
            )}
          </div>
          {customerId === "new" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newName">Nama Pelanggan Baru</Label>
                <Input
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="mis. Citra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPhone">Nomor WA Baru</Label>
                <Input
                  id="newPhone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="08xxx"
                />
              </div>
            </>
          )}
        </div>
        {customerId === "new" && newName.trim() && newPhone.trim() && !customerValid && (
          <p className="text-sm text-red-600">
            Nomor WA tidak valid — format 08xxx (9–14 digit).
          </p>
        )}
        {selectedCustomer?.isBlacklisted && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            ⚠️ Pelanggan ini di-blacklist: {selectedCustomer.name}. Order tidak bisa dibuat.
          </p>
        )}
        {customerId === "new" && (
          <input type="hidden" name="newCustomerName" value={newName} />
        )}
        {customerId === "new" && <input type="hidden" name="newCustomerPhone" value={newPhone} />}
      </section>

      {/* Start date */}
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
          </span>
          Waktu Mulai
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Mulai</Label>
            <DateTimePicker
              id="startDate"
              name="startDate"
              value={startDate}
              onChange={setStartDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rescheduledFrom">Reschedule Dari (opsional)</Label>
            <DatePicker
              value={rescheduledFrom}
              onChange={setRescheduledFrom}
              placeholder="— tanggal lama —"
            />
            {rescheduledFrom && (
              <input type="hidden" name="rescheduledFrom" value={rescheduledFrom} />
            )}
          </div>
        </div>
      </section>

      {/* Guarantee & logistics (hasil normalisasi Catatan Notion) */}
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
                defaultValue={5000}
              />
            </div>
          )}
        </div>
      </section>

      {/* Items */}
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ListPlus className="size-3.5" aria-hidden />
            </span>
            Item
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={products.length === 0}
            className="gap-1.5"
          >
            <Plus className="size-3.5" aria-hidden />
            Tambah Item
          </Button>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada item. Klik &quot;Tambah Item&quot;.
          </p>
        )}

        {pricedItems.map(({ item, product, unitPrice, subtotal }) => {
          const available = availability[item.productId];
          const needed =
            items.filter((it) => it.productId === item.productId).reduce((s, it) => s + it.quantity, 0) -
            item.quantity +
            item.quantity;
          const insufficient = available !== undefined && needed > available;
          return (
            <div
              key={item.key}
              className={`space-y-3 rounded-xl border p-3 ${
                insufficient ? "border-red-300 bg-red-50/50" : "border-border bg-muted/40"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1 md:col-span-2">
                  <Label>Produk</Label>
                  <SelectField
                    value={String(item.productId)}
                    onValueChange={(v) => updateItem(item.key, { productId: Number(v) })}
                    options={products.map((p) => ({
                      label: `${p.name} (${p.sku})`,
                      value: String(p.id),
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Durasi</Label>
                  <SelectField
                    value={String(item.durationHours)}
                    onValueChange={(v) => updateItem(item.key, { durationHours: Number(v) })}
                    options={DURATIONS.map((d) => ({ label: `${d} jam`, value: String(d) }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Harga/unit (opsional)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder={product ? String(unitPrice) : "0"}
                    value={item.unitPriceOverride}
                    onChange={(e) => updateItem(item.key, { unitPriceOverride: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Diskon</Label>
                  <SelectField
                    value={item.discountType}
                    onValueChange={(v) =>
                      updateItem(item.key, { discountType: v as ItemDraft["discountType"] })
                    }
                    options={[
                      { label: "Tanpa diskon", value: "none" },
                      { label: "Nominal (Rp)", value: "amount" },
                      { label: "Persen (%)", value: "percent" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nilai Diskon</Label>
                  <Input
                    type="number"
                    min={0}
                    disabled={item.discountType === "none"}
                    value={item.discountValue}
                    onChange={(e) => updateItem(item.key, { discountValue: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Subtotal</Label>
                  <div className="flex h-8 items-center text-sm font-semibold tabular-nums">
                    {formatRupiah(subtotal)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p
                  className={`flex items-center gap-1.5 text-xs ${
                    insufficient ? "font-medium text-red-600" : "text-muted-foreground"
                  }`}
                >
                  <Package className="size-3.5" aria-hidden />
                  {available === undefined
                    ? "Memeriksa stok…"
                    : `sisa ${available} unit${insufficient ? " — stok tidak cukup" : ""}`}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.key)}
                  className="gap-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Hapus
                </Button>
              </div>
            </div>
          );
        })}

        {stockErrors.length > 0 && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {stockErrors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}
      </section>

      {/* Note + total */}
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="noteOrder">Catatan Order (opsional)</Label>
          <textarea
            id="noteOrder"
            name="noteOrder"
            className="min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-xl font-bold tabular-nums">{formatRupiah(total)}</span>
        </div>
        <Button type="submit" disabled={!canSubmit} className="w-full">
          Simpan Order
        </Button>
        {!customerValid && customerId === "new" && (
          <p className="text-xs text-red-600">Lengkapi nama & nomor WA pelanggan baru.</p>
        )}
      </section>
    </form>
  );
}
