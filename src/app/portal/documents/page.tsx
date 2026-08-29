import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ShieldCheck, PackageCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { storageUrl } from "@/lib/storage-url";
import { deletePortalDocument } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

const DOC_LABELS: Record<string, string> = {
  ktp: "KTP",
  selfie_ktp: "Selfie Identitas",
  kartu_pelajar: "Kartu Pelajar",
  other: "Dokumen Lainnya",
};

export default async function PortalDocumentsPage({
  searchParams,
}: PageProps<"/portal/documents">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (
    !session?.user ||
    session.user.role !== "customer" ||
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    redirect("/portal/login");
  }

  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const deleted = Array.isArray(sp.deleted) ? sp.deleted[0] : sp.deleted;

  const notifications: PageNotification[] = [];
  if (error === "invalid") {
    notifications.push({ type: "error", message: "Dokumen tidak valid." });
  } else if (deleted === "1") {
    notifications.push({ type: "success", message: "Dokumen berhasil dihapus." });
  }

  // Ambil semua dokumen customer
  const documents = await prisma.document.findMany({
    where: { customerId },
    include: { order: { select: { orderNumber: true } } },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8 md:py-12">
      <PageNotifier notifications={notifications} />

      {/* Header + Back */}
      <div className="flex items-center justify-between">
        <Link href="/portal">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke Dashboard
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">
          Dokumen terupload:{" "}
          <span className="font-semibold">{documents.length}</span>
        </div>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ShieldCheck className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Belum ada dokumen</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Kamu belum upload jaminan atau dokumen lainnya.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Per Order Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageCheck className="size-4 text-primary" aria-hidden />
                Dokumen per Pesanan
              </CardTitle>
              <CardDescription>Dokumen jaminan untuk pesanan tertentu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.filter((d) => d.orderId).length === 0 && (
                <p className="text-sm text-muted-foreground">Tidak ada.</p>
              )}
              {documents
                .filter((d) => d.orderId)
                .map((d) => (
                  <div key={d.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {DOC_LABELS[d.docType]} —{" "}
                          <Link
                            href={`/portal/orders/${d.order!.orderNumber}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {d.order!.orderNumber}
                          </Link>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(d.uploadedAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <form action={deletePortalDocument}>
                        <input type="hidden" name="documentId" value={d.id} />
                        <input type="hidden" name="orderId" value={d.orderId || ""} />
                        <input type="hidden" name="back" value="/portal/documents" />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline"
                          aria-label={`Hapus ${DOC_LABELS[d.docType]}`}
                        >
                          Hapus
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* General Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" aria-hidden />
                Dokumen Umum
              </CardTitle>
              <CardDescription>Dokumen tanpa tautan pesanan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.filter((d) => !d.orderId).length === 0 && (
                <p className="text-sm text-muted-foreground">Tidak ada.</p>
              )}
              {documents
                .filter((d) => !d.orderId)
                .map((d) => (
                  <div key={d.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{DOC_LABELS[d.docType]}</p>
                        <p className="text-xs text-muted-foreground">
                          Size: {(d.fileSize / 1024).toFixed(0)} KB · {" "}
                          Uploaded: {new Date(d.uploadedAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <a
                        href={storageUrl(d.filePath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                      >
                        Lihat
                      </a>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
