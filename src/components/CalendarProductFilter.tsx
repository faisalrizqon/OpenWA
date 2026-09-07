"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Dropdown filter produk untuk kalender ketersediaan — pakai shadcn/ui Select
 *  (Base UI) agar konsisten dengan picker lain di admin.
 *  Navigasi mempertahankan param bulan: /admin/calendar?month=YYYY-MM&product=N */
export function CalendarProductFilter({
  products,
  selected,
  month,
}: {
  products: { id: number; name: string }[];
  selected: number | null;
  month: string;
}) {
  const router = useRouter();

  const handleSelect = (value: string) => {
    const params = new URLSearchParams({ month });
    if (value !== "all") params.set("product", value);
    router.push(`/admin/calendar?${params.toString()}`);
  };

  const options = [
    { label: "Semua produk", value: "all" },
    ...products.map((p) => ({ label: p.name, value: String(p.id) })),
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Produk</span>
      <Select
        value={selected != null ? String(selected) : "all"}
        onValueChange={(v) => handleSelect(v as string)}
        items={options}
      >
        <SelectTrigger className="h-9 w-full min-w-[300px] sm:w-auto sm:min-w-[300px]">
          <SelectValue placeholder="Semua produk" />
        </SelectTrigger>
        <SelectContent align="start" className="min-w-[300px] rounded-xl p-1 max-h-80">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="truncate">{o.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
