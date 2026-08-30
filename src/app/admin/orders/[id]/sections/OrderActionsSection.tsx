"use client";

import { useState } from "react";
import { CalendarClock, Pencil, X } from "lucide-react";
import { rescheduleOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/DateTimePicker";
import { toLocalInputValue } from "@/components/order-form/hooks/utils";

/** Quick action reschedule inline: form ringkas untuk mengubah tanggal sewa
 *  tanpa keluar dari halaman detail. Validasi stok dilakukan di server action.
 *  Layout seragam dengan form lain: DateTimePicker + tombol secondary. */
export function OrderActionsSection({
  orderId,
  initialStartDate,
  initialEndDate,
}: {
  orderId: string;
  initialStartDate: Date;
  initialEndDate: Date;
}) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => toLocalInputValue(initialStartDate));
  const [endDate, setEndDate] = useState(() => toLocalInputValue(initialEndDate));

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <CalendarClock className="size-4" aria-hidden />
        Ubah Tanggal
      </Button>
    );
  }

  return (
    <form
      action={rescheduleOrder}
      className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="reschedule-start">Tanggal mulai</Label>
        <DateTimePicker
          id="reschedule-start"
          name="startDate"
          value={startDate}
          onChange={setStartDate}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reschedule-end">Tanggal kembali</Label>
        <DateTimePicker
          id="reschedule-end"
          name="endDate"
          value={endDate}
          onChange={setEndDate}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" className="gap-1.5">
          <Pencil className="size-4" aria-hidden />
          Simpan
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          aria-label="Batal ubah tanggal"
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
