import { PlusCircle } from "lucide-react";
import { extendOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";

/** Form perpanjangan masa sewa — hanya tampil untuk order aktif/terlambat.
 *  Harga item dihitung ulang mengikuti tier durasi baru saat submit. */
export function ExtendOrderForm({ orderId }: { orderId: string }) {
  return (
    <form action={extendOrder} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="space-y-1">
        <label htmlFor="extraDays" className="text-xs font-medium text-muted-foreground">
          Tambah berapa hari?
        </label>
        <input
          id="extraDays"
          name="extraDays"
          type="number"
          min={1}
          max={365}
          defaultValue={1}
          required
          className="h-8 w-24 rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums"
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" className="gap-1.5">
        <PlusCircle className="size-4" aria-hidden />
        Perpanjang Sewa
      </Button>
      <p className="w-full text-xs text-muted-foreground">
        Harga dihitung ulang mengikuti tier durasi baru dan stok periode tambahan dicek dulu.
      </p>
    </form>
  );
}
