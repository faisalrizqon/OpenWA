import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GuaranteeUpload, DOC_LABELS } from "@/components/GuaranteeUpload";
import { submitGuarantee } from "@/app/(shop)/actions/checkout";
import { storageUrl } from "@/lib/storage-url";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface GuaranteeSectionProps {
  order: {
    id: string;
    documents: Array<{
      id: number;
      docType: string;
      filePath: string;
      fileSize: number;
      uploadedAt: Date;
    }>;
  };
}

/** Card Jaminan di halaman detail order — hanya menampilkan dokumen + form
 *  upload. Hapus data tidak lagi lewat tombol ✕ per-foto; semua penghapusan
 *  disatukan di dialog "Hapus Data Order" di bagian bawah halaman. */
export function GuaranteeSection({ order }: GuaranteeSectionProps) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Jaminan</CardTitle>
        <CardDescription>
          KTP / selfie identitas / kartu pelajar sebagai pelengkap data order ini.
          Penghapusan data dilakukan lewat tombol &ldquo;Hapus Data Order&rdquo; di bawah halaman.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 py-3 sm:px-6 sm:py-4 overflow-x-auto">
        {order.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada jaminan terupload. Dokumen jaminan bersifat{" "}
            <span className="font-medium text-foreground">opsional</span> — cukup
            sebagai pelengkap data order.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {order.documents.map((d) => (
              <figure key={d.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(d.filePath)}
                  alt={DOC_LABELS[d.docType] ?? d.docType}
                  className="h-24 w-full rounded-lg border object-cover"
                />
                <figcaption className="mt-1 text-xs text-muted-foreground">
                  {DOC_LABELS[d.docType] ?? d.docType} ·{" "}
                  {format(new Date(d.uploadedAt), "dd MMM yyyy", { locale: localeId })}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-semibold">Upload jaminan</p>
          <GuaranteeUpload
            orderId={order.id}
            action={submitGuarantee}
            back={`/admin/orders/${order.id}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
