"use client";

import { useEffect, useMemo, useState } from "react";
import { createOrder } from "@/actions/orders";
import { getTierPrice, calcSubtotal } from "@/lib/pricing";
import { parseBookingMessage, matchProduct, type ParsedBooking } from "@/lib/parseBooking";
import type { ProductOption, CustomerOption, ItemDraft } from "@/components/order-form/types";
import { DURATIONS } from "@/components/order-form/constants";
import {
  toLocalInputValue,
  addItem as addItemUtil,
  updateItem as updateItemUtil,
  removeItem as removeItemUtil,
} from "@/components/order-form/hooks/utils";
import { WaImportSection } from "@/components/order-form/sections/WaImportSection";
import { CustomerSection } from "@/components/order-form/sections/CustomerSection";
import { DateSection } from "@/components/order-form/sections/DateSection";
import { LogisticsSection } from "@/components/order-form/sections/LogisticsSection";
import { ItemsList, type PricedItem } from "@/components/order-form/sections/ItemsList";
import { SummarySection } from "@/components/order-form/sections/SummarySection";

export function OrderForm({
  products,
  customers,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const now = useMemo(() => new Date(), []);

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
  const [noteOrder, setNoteOrder] = useState("");
  const [tip, setTip] = useState(0);
  const [courierFee, setCourierFee] = useState(5000);
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

  const pricedItems: PricedItem[] = items.map((it) => {
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
  const grandTotal =
    total + (deliveryMode === "courier" ? courierFee : 0) + Math.max(0, tip || 0);

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
    setItems((prev) => [...prev, { key: Date.now(), ...addItemUtil(products) }]);
  }

  function updateItem(key: number, patch: Partial<ItemDraft>) {
    setItems((prev) => updateItemUtil(prev, key, patch));
  }

  function removeItem(key: number) {
    setItems((prev) => removeItemUtil(prev, key));
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

      <WaImportSection
        waMessage={waMessage}
        setWaMessage={setWaMessage}
        waParsed={waParsed}
        onApplyBookingMessage={applyBookingMessage}
      />

      <CustomerSection
        customerId={customerId}
        setCustomerId={setCustomerId}
        customers={customers}
        selectedCustomer={selectedCustomer}
        newName={newName}
        setNewName={setNewName}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        customerValid={customerValid}
      />

      <DateSection
        startDate={startDate}
        setStartDate={setStartDate}
        rescheduledFrom={rescheduledFrom}
        setRescheduledFrom={setRescheduledFrom}
      />

      <LogisticsSection
        guaranteeType={guaranteeType}
        setGuaranteeType={setGuaranteeType}
        guaranteeNumber={guaranteeNumber}
        setGuaranteeNumber={setGuaranteeNumber}
        deliveryMode={deliveryMode}
        setDeliveryMode={setDeliveryMode}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        courierFee={courierFee}
        setCourierFee={setCourierFee}
      />

      <ItemsList
        items={items}
        products={products}
        availability={availability}
        pricedItems={pricedItems}
        addItem={addItem}
        updateItem={updateItem}
        removeItem={removeItem}
        stockErrors={stockErrors}
      />

      <SummarySection
        noteOrder={noteOrder}
        setNoteOrder={setNoteOrder}
        total={grandTotal}
        canSubmit={canSubmit}
        tip={tip}
        setTip={setTip}
        courierFee={deliveryMode === "courier" ? courierFee : 0}
        itemsTotal={total}
      />
    </form>
  );
}

export default OrderForm;
