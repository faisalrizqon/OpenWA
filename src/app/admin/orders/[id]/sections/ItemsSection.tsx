import { formatRupiah } from "@/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemsManageForm } from "./ItemsManageForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ItemsSectionProps {
  orderId: string;
  items: Array<{
    id: number;
    product: {
      id: number;
      name: string;
      price6h: number;
      price12h: number;
      price24h: number;
      price48h: number;
    };
    unit: { id: number; serialNumber: string | null; condition: string } | null;
    quantity: number;
    durationHours: number;
    unitPrice: number;
    discountType: string | null;
    discountValue: number;
    subtotal: number;
  }>;
  locked?: boolean;
}

/** Tabel item yang disewa pada order ini — item bisa dikelola (tambah/hapus/
 *  ubah qty & durasi) lewat ikon edit di pojok kanan atas. */
export function ItemsSection({ orderId, items, locked = false }: ItemsSectionProps) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Item</CardTitle>
          <ItemsManageForm
            orderId={orderId}
            items={items.map((it) => ({
              id: it.id,
              productName: it.product.name,
              productId: it.product.id,
              quantity: it.quantity,
              durationHours: it.durationHours,
              unitPrice: it.unitPrice,
              subtotal: it.subtotal,
            }))}
            products={items.map((it) => ({ ...it.product }))}
            locked={locked}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="py-1.5">Produk</TableHead>
              <TableHead className="hidden py-1.5 text-center sm:table-cell">Qty</TableHead>
              <TableHead className="hidden py-1.5 text-center sm:table-cell">Durasi</TableHead>
              <TableHead className="hidden py-1.5 text-right sm:table-cell">Harga</TableHead>
              <TableHead className="hidden py-1.5 text-right sm:table-cell">Diskon</TableHead>
              <TableHead className="py-1.5 text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="py-2">
                  <p className="font-medium">{it.product.name}</p>
                  {it.unit && (
                    <p className="text-xs text-muted-foreground">
                      Unit #{it.unit.serialNumber ?? it.unit.id} · {it.unit.condition}
                    </p>
                  )}
                </TableCell>
                <TableCell className="hidden py-2 text-center sm:table-cell sm:text-xs tabular-nums">
                  {it.quantity}
                </TableCell>
                <TableCell className="hidden py-2 text-center sm:table-cell text-xs text-muted-foreground">
                  {it.durationHours} jam
                </TableCell>
                <TableCell className="hidden py-2 text-right sm:table-cell text-xs tabular-nums">
                  {formatRupiah(it.unitPrice)}
                </TableCell>
                <TableCell className="hidden py-2 text-right sm:table-cell text-xs text-muted-foreground">
                  {it.discountType === "amount"
                    ? `-${formatRupiah(it.discountValue)}`
                    : it.discountType === "percent"
                      ? `-${it.discountValue}%`
                      : "—"}
                </TableCell>
                <TableCell className="py-2 text-right font-medium tabular-nums">
                  {formatRupiah(it.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
