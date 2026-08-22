"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

/**
 * Proper dropdown built on Base UI Select. Posts via hidden input `name`
 * (native form submission) and supports controlled `value`/`onValueChange`.
 */
export function SelectField({
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Pilih…",
  className,
  triggerClassName,
  id,
  disabled,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={(v) => onValueChange?.(v as string)}
      items={options.map((o) => ({ label: o.label, value: o.value }))}
    >
      <SelectTrigger
        id={id}
        className={cn("h-9 w-full rounded-xl", triggerClassName)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("rounded-xl p-1", className)}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
