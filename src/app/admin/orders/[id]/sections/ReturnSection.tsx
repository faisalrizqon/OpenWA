import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnForm } from "@/components/ReturnForm";
import { ReturnPhotoGrid, type ReturnPhotoItem } from "@/components/ReturnPhotoGrid";

export interface ReturnSectionProps {
  order: {
    id: string;
    returnPhotos: ReturnPhotoItem[];
  };
  /** Order aktif/terlambat → form return bisa dipakai. */
  active: boolean;
  assignedUnits: Array<{
    unitId: number;
    productName: string;
    serialNumber: string | null;
  }>;
}

/** Form return + foto kondisi barang. */
export function ReturnSection({ order, active, assignedUnits }: ReturnSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Return & Penyelesaian</CardTitle>
        <CardDescription>
          {active
            ? "Foto kondisi barang + set kondisi unit, lalu selesaikan. Foto bisa dihapus via ✕ bila salah upload."
            : "Tersedia saat order aktif / terlambat"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active && <ReturnForm orderId={order.id} units={assignedUnits} />}
        <ReturnPhotoGrid orderId={order.id} photos={order.returnPhotos} />
        {!active && order.returnPhotos.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada proses return.</p>
        )}
      </CardContent>
    </Card>
  );
}
