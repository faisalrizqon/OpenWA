"use client";

import { useState } from "react";
import { CalendarClock, Save, X } from "lucide-react";
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
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

/** Ubah tanggal sewa via dialog overlay — perubahan disimpan sebagai draft.
 *  Ikon kalender di pojok kanan atas card Pelanggan & Aksi → popup dengan dua
 *  DateTimePicker. Validasi stok dilakukan saat tombol Simpan utama ditekan
 *  (batch commit), bukan di sini. */
export function OrderActionsSection({
  initialStartDate,
  initialEndDate,
}: {
  initialStartDate: Date;
  initialEndDate: Date;
}) {
  const [open, setOpen] = useState(false);
  const draft = useOptionalOrderDraft();

  // Nilai awal = draft jika sudah diubah, atau data server jika belum.
  const [startValue, setStartValue] = useState(() =>
    toLocalInputValue(draft?.reschedule ? new Date(draft.reschedule.startDate) : initialStartDate)
  );
  const [endValue, setEndValue] = useState(() =>
    toLocalInputValue(draft?.reschedule ? new Date(draft.reschedule.endDate) : initialEndDate)
  );
  const [error, setError] = useState("");

  function applyToDraft() {
    if (!draft) return;
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setError("Rentang tanggal tidak valid — tanggal kembali harus setelah tanggal mulai.");
      return;
    }
    setError("");
    draft.setReschedule({ startDate: startValue, endDate: endValue });
    setOpen(false);
  }

  function discard() {
    // Kembalikan input ke nilai yang sudah tersimpan di draft (atau server).
    setStartValue(
      toLocalInputValue(draft?.reschedule ? new Date(draft.reschedule.startDate) : initialStartDate)
    );
    setEndValue(
      toLocalInputValue(draft?.reschedule ? new Date(draft.reschedule.endDate) : initialEndDate)
    );
    setError("");
    draft?.setReschedule(null);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Saat ditutup tanpa menerapkan, kembalikan input ke nilai draft terakhir.
        if (!next) {
          setStartValue(
            toLocalInputValue(
              draft?.reschedule ? new Date(draft.reschedule.startDate) : initialStartDate
            )
          );
          setEndValue(
            toLocalInputValue(
              draft?.reschedule ? new Date(draft.reschedule.endDate) : initialEndDate
            )
          );
          setError("");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full border-primary/25 bg-transparent text-muted-foreground shadow-none hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <CalendarClock className="size-4" aria-hidden />
            <span>Ubah Tanggal</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Tanggal Sewa</DialogTitle>
          <DialogDescription>
            Perubahan disimpan sebagai draft — baru tersimpan setelah Anda menekan tombol{" "}
            <strong>Simpan</strong> di atas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-start">Tanggal mulai</Label>
            <DateTimePicker
              id="reschedule-start"
              value={startValue}
              onChange={setStartValue}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reschedule-end">Tanggal kembali</Label>
            <DateTimePicker
              id="reschedule-end"
              value={endValue}
              onChange={setEndValue}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discard}
              disabled={!draft?.reschedule}
              aria-label="Buang perubahan tanggal"
              className="gap-1.5"
            >
              <X className="size-3.5" aria-hidden />
              Buang perubahan
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={applyToDraft}
              disabled={!draft}
              className="gap-1.5"
            >
              <Save className="size-3.5" aria-hidden />
              Terapkan ke Draft
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
