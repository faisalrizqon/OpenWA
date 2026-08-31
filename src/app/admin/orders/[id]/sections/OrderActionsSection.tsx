"use client";

import { useState } from "react";
import { CalendarClock, Save, X } from "lucide-react";
import { rescheduleOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/DateTimePicker";
import { toLocalInputValue } from "@/components/order-form/hooks/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Ubah tanggal sewa via dialog overlay: ikon kalender di pojok kanan atas
 *  card Pelanggan & Aksi → popup dengan dua DateTimePicker. Validasi stok
 *  dilakukan di server action. */
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary">
            <CalendarClock className="size-4" aria-hidden />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Tanggal Sewa</DialogTitle>
          <DialogDescription>
            Stok unit divalidasi ulang untuk rentang baru oleh server.
          </DialogDescription>
        </DialogHeader>

        <form action={rescheduleOrder} className="space-y-3">
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

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              aria-label="Batal ubah tanggal"
              className="gap-1.5"
            >
              <X className="size-3.5" aria-hidden />
              Batal
            </Button>
            <Button type="submit" variant="secondary" size="sm" className="gap-1.5">
              <Save className="size-3.5" aria-hidden />
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
