import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ClipboardList, ImageIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { BlacklistToggle } from "@/components/BlacklistToggle";
import { KtpUpload } from "@/components/KtpUpload";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DOC_LABELS: Record<string, string> = {
  ktp: "KTP",
  selfie_ktp: "Selfie + KTP",
  kartu_pelajar: "Kartu Pelajar",
  other: "Lainnya",
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={customer.phone}
        backHref="/customers"
      />

      {error === "file" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          File tidak valid — hanya JPG/PNG/WebP maksimal 5MB.
        </p>
      )}
      {error === "reason" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Alasan blacklist wajib diisi (min. 3 karakter).
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Nomor WA: </span>
              <a
                href={`https://wa.me/62${customer.phone.slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-600 hover:underline"
              >
                {customer.phone}
              </a>
            </div>
            {customer.email && (
              <div>
                <span className="text-muted-foreground">Email: </span>
                {customer.email}
              </div>
            )}
            {customer.address && (
              <div>
                <span className="text-muted-foreground">Alamat: </span>
                {customer.address}
              </div>
            )}
            {customer.notes && (
              <div>
                <span className="text-muted-foreground">Catatan: </span>
                {customer.notes}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Terdaftar: </span>
              {format(new Date(customer.createdAt), "dd MMM yyyy", { locale: localeId })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blacklist</CardTitle>
            <CardDescription>
              Pelanggan blacklist ditandai merah dan diperingatkan saat membuat order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.isBlacklisted ? (
              <>
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {customer.blacklistReason}
                </p>
                <BlacklistToggle customerId={customer.id} isBlacklisted={customer.isBlacklisted} />
              </>
            ) : (
              <BlacklistToggle customerId={customer.id} isBlacklisted={customer.isBlacklisted} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Order</CardTitle>
          <CardDescription>{customer.orders.length} order</CardDescription>
        </CardHeader>
        <CardContent>
          {customer.orders.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center text-sm text-muted-foreground">
              <ClipboardList className="size-5" aria-hidden />
              <p>Belum ada order.</p>
              <Link href="/orders/new" className="font-medium text-primary hover:underline">
                Buat order untuk pelanggan ini
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(o.startDate), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatRupiah(o.items.reduce((s, it) => s + it.subtotal, 0))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumen</CardTitle>
          <CardDescription>KTP / selfie KTP / kartu pelajar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer.documents.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-center text-sm text-muted-foreground">
              <ImageIcon className="size-5" aria-hidden />
              <p>Belum ada dokumen terunggah.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {customer.documents.map((d) => (
                <figure key={d.id} className="space-y-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.filePath}
                    alt={DOC_LABELS[d.docType] ?? d.docType}
                    className="h-40 w-40 rounded-xl border object-cover"
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    {DOC_LABELS[d.docType] ?? d.docType} ·{" "}
                    {format(new Date(d.uploadedAt), "dd MMM yyyy", { locale: localeId })}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="border-t pt-4">
            <KtpUpload customerId={customer.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
