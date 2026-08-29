"use client";

import { useState } from "react";
import { CalendarClock, Pencil, X } from "lucide-react";
import { rescheduleOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInputValue } from "@/components/order-form/hooks/utils";

/** Quick action reschedule inline: form ringkas untuk mengubah tanggal sewa
 *  tanpa keluar dari halaman detail. Validasi stok dilakukan di server action. */
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <CalendarClock className="size-3.5" aria-hidden />
        Ubah Tanggal
      </button>
    );
  }

  return (
    <form
      action={rescheduleOrder}
      className="inline-flex flex-wrap items-end gap-2 rounded-md border border-border bg-card px-3 py-2"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <div className="space-y-0.5">
        <Label htmlFor="reschedule-start" className="text-[10px] font-medium text-muted-foreground">
          Mulai
        </Label>
        <Input
          id="reschedule-start"
          name="startDate"
          type="datetime-local"
          defaultValue={toLocalInputValue(initialStartDate)}
          required
          className="h-8 w-44 px-2 text-xs"
        />
      </div>
      <div className="space-y-0.5">
        <Label htmlFor="reschedule-end" className="text-[10px] font-medium text-muted-foreground">
          Selesai
        </Label>
        <Input
          id="reschedule-end"
          name="endDate"
          type="datetime-local"
          defaultValue={toLocalInputValue(initialEndDate)}
          required
          className="h-8 w-44 px-2 text-xs"
        />
      </div>
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" className="h-8 gap-1">
          <Pencil className="size-3" aria-hidden />
          Simpan
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setOpen(false)}
          aria-label="Batal ubah tanggal"
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
