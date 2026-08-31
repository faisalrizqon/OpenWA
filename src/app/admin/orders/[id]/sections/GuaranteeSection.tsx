import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GuaranteeUpload, GuaranteeDocs } from "@/components/GuaranteeUpload";
import { submitGuarantee } from "@/app/(shop)/actions/checkout";

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

/** Card Jaminan di halaman detail order admin — dokumen tampil dengan zoom
 *  dan tombol ✕ per dokumen untuk revisi bila salah upload. */
export function GuaranteeSection({ order }: GuaranteeSectionProps) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Jaminan</CardTitle>
        <CardDescription>
          KTP / selfie identitas / kartu pelajar sebagai pelengkap data order ini.
          Klik ✕ untuk menghapus bila salah upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 py-3 sm:px-6 sm:py-4 overflow-x-auto">
        <GuaranteeDocs
          orderId={order.id}
          documents={order.documents}
          back={`/admin/orders/${order.id}`}
          allowDelete
        />
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
