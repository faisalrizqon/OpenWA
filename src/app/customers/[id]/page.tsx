import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { BlacklistToggle } from "@/components/BlacklistToggle";
import { KtpUpload } from "@/components/KtpUpload";
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
  const { error } = await searchParams;
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
    <div className="p-4 space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">
          {customer.name}{" "}
          {customer.isBlacklisted && (
            <span className="align-middle inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              Blacklist
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          <Link href="/customers" className="hover:underline">
            ← Kembali ke daftar pelanggan
          </Link>
        </p>
      </div>

      {error === "file" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          File tidak valid — hanya JPG/PNG/WebP maksimal 5MB
        </p>
      )}
      {error === "reason" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Alasan blacklist wajib diisi (min. 3 karakter)
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-zinc-500">Nomor WA: </span>
              <a
                href={`https://wa.me/62${customer.phone.slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {customer.phone}
              </a>
            </div>
            {customer.email && (
              <div>
                <span className="text-zinc-500">Email: </span>
                {customer.email}
              </div>
            )}
            {customer.address && (
              <div>
                <span className="text-zinc-500">Alamat: </span>
                {customer.address}
              </div>
            )}
            {customer.notes && (
              <div>
                <span className="text-zinc-500">Catatan: </span>
                {customer.notes}
              </div>
            )}
            <div>
              <span className="text-zinc-500">Terdaftar: </span>
              {format(new Date(customer.createdAt), "dd MMM yyyy", { locale: localeId })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blacklist</CardTitle>
            <CardDescription>
              Pelanggan blacklist ditandai merah di daftar dan diperingatkan saat membuat order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.isBlacklisted ? (
              <>
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Alasan: {customer.blacklistReason}
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
            <p className="py-4 text-center text-sm text-zinc-500">Belum ada order.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {format(new Date(o.startDate), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>
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
            <p className="text-sm text-zinc-500">Belum ada dokumen terunggah.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {customer.documents.map((d) => (
                <div key={d.id} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.filePath} alt={d.docType} className="w-40 rounded border" />
                  <p className="text-xs text-zinc-500">{DOC_LABELS[d.docType] ?? d.docType}</p>
                </div>
              ))}
            </div>
          )}
          <KtpUpload customerId={customer.id} />
        </CardContent>
      </Card>
    </div>
  );
}
