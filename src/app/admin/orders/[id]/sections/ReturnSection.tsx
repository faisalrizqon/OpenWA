import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnForm } from "@/components/ReturnForm";
import { ReturnPhotoGrid, type ReturnPhotoItem } from "@/components/ReturnPhotoGrid";
import { ReturnPhotoAddForm } from "@/components/ReturnPhotoAddForm";

export interface ReturnSectionProps {
  order: {
    id: string;
    status: string;
    returnPhotos: ReturnPhotoItem[];
  };
  /** Order aktif/terlambat → form penyelesaian lengkap tersedia. */
  active: boolean;
  assignedUnits: Array<{
    unitId: number;
    productName: string;
    serialNumber: string | null;
  }>;
}

/**
 * Return & Penyelesaian:
 * - Order aktif/terlambat: form lengkap (kondisi unit + foto + selesaikan).
 * - Order selesai: tetap bisa tambah/revisi foto kondisi (tanpa ubah status).
 * - Semua foto terupload bisa dihapus via ✕ dengan konfirmasi.
 */
export function ReturnSection({ order, active, assignedUnits }: ReturnSectionProps) {
  const completed = order.status === "completed";

  return (
    <Card id="return-penyelesaian" className="scroll-mt-4 min-w-0">
      <CardHeader>
        <CardTitle>Return & Penyelesaian</CardTitle>
        <CardDescription>
          {active
            ? "Foto kondisi barang + set kondisi unit, lalu selesaikan. Foto bisa dihapus via ✕ bila salah upload."
            : completed
              ? "Order selesai — tambah/revisi foto kondisi barang tanpa mengubah status order."
              : "Tersedia saat order aktif / terlambat"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto px-3 py-3 sm:px-6 sm:py-4">
        {active && <ReturnForm orderId={order.id} units={assignedUnits} />}
        <ReturnPhotoGrid orderId={order.id} photos={order.returnPhotos} />
        {completed && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <ReturnPhotoAddForm orderId={order.id} />
          </div>
        )}
        {!active && !completed && order.returnPhotos.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada proses return.</p>
        )}
      </CardContent>
    </Card>
  );
}
