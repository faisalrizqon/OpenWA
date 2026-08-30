"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/SelectField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkUpdateOrderStatus, bulkDeleteOrder } from "@/actions/orders";
import { cn } from "@/lib/utils";

export interface OrderRow {
  id: string;
  orderNumber: string;
  source: string;
  status: string;
  startDate: string; // ISO
  customerName: string;
  itemSummary: string;
  total: number;
  paid: number;
  paymentCompleted: boolean;
}

const BULK_STATUS_OPTIONS = [
  { label: "Booking", value: "booking" },
  { label: "Aktif", value: "active" },
  { label: "Terlambat", value: "late" },
  { label: "Selesai", value: "completed" },
  { label: "Dibatalkan", value: "cancelled" },
];

/** Tabel order dengan checkbox seleksi + bar aksi massal (ubah status). */
export function OrdersBulkTable({ rows }: { rows: OrderRow[] }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, setPending] = React.useState(false);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative space-y-3">
      {/* Bar aksi massal — di atas tabel, sticky saat scroll */}
      {someSelected && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-lg">
          <span className="text-sm font-semibold tabular-nums">
            {selected.size} order dipilih
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk status update form */}
            <form
              action={bulkUpdateOrderStatus}
              className="flex flex-wrap items-center gap-2"
              onSubmit={() => setPending(true)}
            >
              {Array.from(selected).map((id) => (
                <input key={id} type="hidden" name="orderIds" value={id} />
              ))}
              <div className="w-44">
                <SelectField
                  name="newStatus"
                  defaultValue="completed"
                  options={BULK_STATUS_OPTIONS}
                  triggerClassName="h-8 rounded-lg border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                  className="border-slate-200 bg-white text-slate-900"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={pending}
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
                Terapkan Status
              </Button>
            </form>

            <span className="h-5 w-px shrink-0 bg-slate-300" aria-hidden />

            {/* Delete form */}
            <BulkDeleteForm selectedIds={Array.from(selected)} pending={pending} />

            <span className="h-5 w-px shrink-0 bg-slate-300" aria-hidden />

            {/* Batal pilih */}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="size-3.5" aria-hidden />
              Batal
            </button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader className="[&_tr]:border-b-2 [&_tr]:border-primary/20">
          <TableRow className="bg-muted/80 hover:bg-muted/80">
            <TableHead className="w-10 min-w-[2.5rem]">
              <input
                type="checkbox"
                aria-label="Pilih semua order"
                checked={allSelected}
                onChange={toggleAll}
                className="size-4 cursor-pointer accent-primary"
              />
            </TableHead>
            <TableHead className="min-w-[120px] text-xs font-bold uppercase tracking-wider text-foreground">Nomor</TableHead>
            <TableHead className="min-w-[100px] text-xs font-bold uppercase tracking-wider text-foreground">Mulai</TableHead>
            <TableHead className="max-w-[180px] text-xs font-bold uppercase tracking-wider text-foreground">Pelanggan</TableHead>
            <TableHead className="max-w-[200px] text-xs font-bold uppercase tracking-wider text-foreground">Item</TableHead>
            <TableHead className="text-right min-w-[100px] text-xs font-bold uppercase tracking-wider text-foreground">Total</TableHead>
            <TableHead className="text-right min-w-[100px] text-xs font-bold uppercase tracking-wider text-foreground">Dibayar</TableHead>
            <TableHead className="text-right min-w-[80px] text-xs font-bold uppercase tracking-wider text-foreground">Sisa</TableHead>
            <TableHead className="text-center min-w-[100px] text-xs font-bold uppercase tracking-wider text-foreground">Pembayaran</TableHead>
            <TableHead className="min-w-[70px] text-xs font-bold uppercase tracking-wider text-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o) => {
            const sisa = o.total - o.paid;
            return (
              <TableRow key={o.id} className={cn(selected.has(o.id) && "bg-primary/5")}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Pilih order ${o.orderNumber}`}
                    checked={selected.has(o.id)}
                    onChange={() => toggleOne(o.id)}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    {o.orderNumber}
                    {o.source === "online" && (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        Online
                      </Badge>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {format(new Date(o.startDate), "dd MMMM yyyy", { locale: localeId })}
                </TableCell>
                <TableCell>{o.customerName}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">
                  {o.itemSummary}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatRupiah(o.total)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatRupiah(o.paid)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    sisa > 0 ? "font-semibold text-red-600" : "text-muted-foreground"
                  )}
                >
                  {formatRupiah(Math.max(0, sisa))}
                </TableCell>
                <TableCell className="text-center">
                  {o.paymentCompleted ? (
                    o.status === "booking" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                        Siap Diproses
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Terverifikasi</Badge>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Separate form component for delete bulk action (avoid nested forms issue)
function BulkDeleteForm({ selectedIds, pending }: { selectedIds: string[]; pending: boolean }) {
  if (selectedIds.length === 0) return null;

  return (
    <form
      action={bulkDeleteOrder}
      onSubmit={(e) => {
        if (!confirm(`Hapus ${selectedIds.length} order yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) {
          e.preventDefault();
        }
      }}
    >
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="orderId" value={id} />
      ))}
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="gap-1.5 bg-red-500 text-white hover:bg-red-600"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
        Hapus
      </Button>
    </form>
  );
}
