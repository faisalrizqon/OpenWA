import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnForm } from "@/components/ReturnForm";
import { ReturnPhotoAddForm } from "@/components/ReturnPhotoAddForm";
import { storageUrl } from "@/lib/storage-url";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface ReturnSectionProps {
  order: {
    id: string;
    status: string;
    returnPhotos: Array<{
      id: number;
      filePath: string;
      uploadedAt: Date;
    }>;
  };
  /** Order aktif/terlambat → form penyelesaian lengkap tersedia. */
  active: boolean;
  assignedUnits: Array<{
    unitId: number;
    productName: string;
    serialNumber: string | null;
  }>;
}

/** Card Return & Penyelesaian di halaman detail order — hanya menampilkan foto
 *  + form tambah. Hapus data tidak lagi lewat tombol ✕ per-foto; semua
 *  penghapusan disatukan di dialog &ldquo;Hapus Data Order&rdquo; di bawah halaman. */
export function ReturnSection({ order, active, assignedUnits }: ReturnSectionProps) {
  const completed = order.status === "completed";

  return (
    <Card id="return-penyelesaian" className="min-w-0">
      <CardHeader>
        <CardTitle>Return & Penyelesaian</CardTitle>
        <CardDescription>
          {active
            ? "Foto kondisi barang + set kondisi unit, lalu selesaikan."
            : completed
              ? "Tambah/foto revisi kondisi barang."
              : "Tersedia saat order aktif / terlambat"}{" "}
          Penghapusan data dilakukan lewat tombol &ldquo;Hapus Data Order&rdquo; di bawah halaman.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto px-3 py-3 sm:px-6 sm:py-4">
        {active && <ReturnForm orderId={order.id} units={assignedUnits} />}

        {order.returnPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {order.returnPhotos.map((p) => (
              <figure key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(p.filePath)}
                  alt={`Foto kondisi ${format(new Date(p.uploadedAt), "dd/MM", { locale: localeId })}`}
                  className="h-28 w-full rounded-lg border object-cover"
                />
                <figcaption className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(p.uploadedAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : active ? (
          <p className="text-sm text-muted-foreground">
            Belum ada proses return. Upload foto setelah order dikembalikan.
          </p>
        ) : completed ? (
          <div className="rounded-xl border bg-muted/30 p-4">
            <ReturnPhotoAddForm orderId={order.id} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada proses return.</p>
        )}
      </CardContent>
    </Card>
  );
}
