"use client";

import { CalendarClock } from "lucide-react";
import { DateTimePicker, DatePicker } from "@/components/DateTimePicker";
import { Label } from "@/components/ui/label";

export interface DateSectionProps {
  startDate: string;
  setStartDate: (value: string) => void;
  rescheduledFrom: string;
  setRescheduledFrom: (value: string) => void;
}

/** Start date & reschedule section. */
export function DateSection({
  startDate,
  setStartDate,
  rescheduledFrom,
  setRescheduledFrom,
}: DateSectionProps) {
  return (
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
  );
}
