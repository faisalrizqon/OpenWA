"use client";

import { useState } from "react";
import { DatePicker } from "@/components/DateTimePicker";
import { Label } from "@/components/ui/label";

/**
 * Wrapper DatePicker untuk form server-action (promo).
 * Menyimpan state lokal dan mengirim nilai via hidden input `name`
 * sehingga cocok dengan `createPromo` yang membaca FormData.
 */
export function PromoDateField({
  name,
  label,
  placeholder = "Pilih tanggal",
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={value} required />
      <DatePicker
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        className="h-9 w-full justify-start"
      />
    </div>
  );
}
