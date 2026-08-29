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

export function GuaranteeSection({
  order,
}: GuaranteeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jaminan</CardTitle>
        <CardDescription>
          KTP / selfie identitas / kartu pelajar sebagai pelengkap data order ini.
          Klik ✕ untuk menghapus bila salah upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GuaranteeDocs
          orderId={order.id}
          documents={order.documents}
          back={`/admin/orders/${order.id}`}
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
