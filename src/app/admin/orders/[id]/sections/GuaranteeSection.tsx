import { ArrowRight, CheckCircle2 } from "lucide-react";
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
  const hasGuarantee = order.documents.length > 0;

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

        {/* Lanjutan setelah jaminan terupload: arahkan ke catat pembayaran & penyelesaian */}
        {hasGuarantee && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="size-4" aria-hidden />
              Jaminan sudah terupload
            </p>
            <p className="mb-3 text-xs text-emerald-700">
              Lanjutkan dengan mencatat pembayaran bila customer membayar di tempat.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="#catat-pembayaran"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Catat Pembayaran
                <ArrowRight className="size-3.5" aria-hidden />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
