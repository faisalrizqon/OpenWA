import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ClipboardList, ImageIcon, Lock as LockIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { storageUrl } from "@/lib/storage";
import { StatusBadge } from "@/components/StatusBadge";
import { KtpUpload } from "@/components/KtpUpload";
import { PageHeader } from "@/components/PageHeader";
import { BackLink } from "@/components/BackLink";
import { BlacklistToggle } from "@/components/BlacklistToggle";
import { ExternalLink } from "@/components/LinkButton";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import {
  DeleteCustomerDialog,
  DeleteDocumentButton,
} from "@/components/CustomerAdminActions";
import { updateCustomer, setCustomerPassword } from "@/actions/customers";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  selfie_ktp: "Selfie + Identitas",
  kartu_pelajar: "Kartu Pelajar",
  other: "Lainnya",
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/customers/[id]">) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  const { id } = await params;
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;
  const pwdSet = Array.isArray(errorParam.pwd_set) ? errorParam.pwd_set[0] : errorParam.pwd_set;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true, payments: true },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!customer) notFound();

  // Statistik pelanggan
  const totalSpent = customer.orders.reduce((sum, o) => {
    if (o.status === "cancelled") return sum;
    return (
      sum +
      o.payments
        .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType) && p.status !== "pending")
        .reduce((s, p) => s + p.amount, 0)
    );
  }, 0);
  const lastOrder = customer.orders.find((o) => o.status !== "cancelled");
  const activeOrders = customer.orders.filter((o) =>
    ["booking", "active", "late"].includes(o.status)
  ).length;

  const notifications: PageNotification[] = [];
  if (pwdSet === "1") {
    notifications.push({ type: "success", message: "Password portal berhasil disimpan. Customer bisa login di /portal." });
  }
  if (error === "file") {
    notifications.push({ type: "error", message: "File tidak valid — hanya JPG/PNG/WebP maksimal 5MB." });
  }
  if (error === "pwd") {
    notifications.push({ type: "error", message: "Password minimal 6 karakter." });
  }
  if (error === "reason") {
    notifications.push({ type: "error", message: "Alasan blacklist wajib diisi (min. 3 karakter)." });
  }
  if (error === "phone_taken") {
    notifications.push({ type: "error", message: "Nomor WA sudah dipakai pelanggan lain." });
  }
  if (error === "invalid") {
    notifications.push({ type: "error", message: "Data tidak valid — nama wajib, nomor WA format 08xxx (9–14 digit)." });
  }
  if (error && !["file", "pwd", "reason", "phone_taken", "invalid"].includes(error)) {
    notifications.push({ type: "error", message: decodeURIComponent(error) });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={customer.phone}
        backHref="/admin/customers"
        action={
          <div className="flex items-center gap-2">
            <ExternalLink
              href={`https://wa.me/62${customer.phone.slice(1)}`}
              label="WhatsApp"
              tone="emerald"
              icon={<WhatsAppIcon aria-hidden />}
            />
          {isAdmin && (
            <DeleteCustomerDialog
              customerId={customer.id}
              customerName={customer.name}
              orderCount={customer.orders.length}
            />
          )}
          </div>
        }
      />
      <PageNotifier notifications={notifications} />
      {customer.isBlacklisted && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Pelanggan ini di-blacklist: {customer.blacklistReason}
        </p>
      )}

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-medium text-muted-foreground">Total Order</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{customer.orders.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-medium text-muted-foreground">Sedang Berjalan</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{activeOrders}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-medium text-muted-foreground">Total Dibayar</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatRupiah(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-medium text-muted-foreground">Order Terakhir</p>
            <p className="mt-1 text-sm font-bold">
              {lastOrder
                ? format(new Date(lastOrder.startDate), "dd MMM yyyy", { locale: localeId })
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Portal Access (customer login) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LockIcon className="size-4" aria-hidden />
              Portal Customer
            </CardTitle>
            <CardDescription>
              Set/reset kata sandi untuk portal review customer (/portal/login)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={setCustomerPassword}>
              <input type="hidden" name="customerId" value={customer.id} />
              <div className="grid gap-3 sm:grid-cols-[auto_auto_96px]">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                    Kata Sandi Portal (min 6 karakter)
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-9"
                  />
                </div>
                {customer.passwordHash && (
                  <p className="flex items-center text-xs text-neutral-500">
                    ✓ Sudah diset ({format(new Date(customer.createdAt), "dd MMM yyyy", { locale: localeId })})
                  </p>
                )}
                <Button type="submit" size="sm">
                  {customer.passwordHash ? "Ganti Password" : "Set Password"}
                </Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Customer akan dapat login dengan No. HP + password ini di /portal/login
            </p>
          </CardContent>
        </Card>
      )}


      <div className="grid gap-4 lg:grid-cols-2">
        {/* Form edit */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Data Pelanggan</CardTitle>
            <CardDescription>Ubah kontak, identitas, dan status blacklist</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateCustomer} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="isBlacklisted" value={String(customer.isBlacklisted)} />
              {customer.isBlacklisted && (
                <input
                  type="hidden"
                  name="blacklistReason"
                  value={customer.blacklistReason ?? ""}
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nama</Label>
                <Input id="name" name="name" required defaultValue={customer.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor WA</Label>
                <Input id="phone" name="phone" required defaultValue={customer.phone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (opsional)</Label>
                <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat (opsional)</Label>
                <Input id="address" name="address" defaultValue={customer.address ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={customer.notes ?? ""}
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Button type="submit">Simpan Perubahan</Button>
                <BackLink href="/admin/customers" label="Batal" className="h-8 rounded-lg" />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Blacklist */}
        <Card>
          <CardHeader>
            <CardTitle>Status Blacklist</CardTitle>
            <CardDescription>
              Pelanggan blacklist tidak bisa membuat order baru — toggle di bawah
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAdmin ? (
              <BlacklistSection
                customerId={customer.id}
                isBlacklisted={customer.isBlacklisted}
                reason={customer.blacklistReason}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Blacklist:{" "}
                {customer.isBlacklisted ? (
                  <span className="font-medium text-red-600">Ya</span>
                ) : (
                  <span className="font-medium">Tidak</span>
                )}
                {customer.isBlacklisted && customer.blacklistReason && (
                  <> — {customer.blacklistReason}</>
                )}
              </p>
            )}
            <div className="border-t pt-3 text-sm">
              <p className="text-muted-foreground">
                Terdaftar:{" "}
                {format(new Date(customer.createdAt), "dd MMM yyyy HH:mm", { locale: localeId })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Riwayat order */}
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
              <Link href="/admin/orders/new" className="font-medium text-primary hover:underline">
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
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
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

      {/* Dokumen */}
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
                    src={storageUrl(d.filePath)}
                    alt={DOC_LABELS[d.docType] ?? d.docType}
                    className="h-40 w-40 rounded-xl border object-cover"
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    {DOC_LABELS[d.docType] ?? d.docType} ·{" "}
                    {format(new Date(d.uploadedAt), "dd MMM yyyy", { locale: localeId })}
                  </figcaption>
                  {isAdmin && (
                    <DeleteDocumentButton documentId={d.id} customerId={customer.id} />
                  )}
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

/** Section blacklist: form toggle dengan alasan. Server component biasa. */
function BlacklistSection({
  customerId,
  isBlacklisted,
  reason,
}: {
  customerId: number;
  isBlacklisted: boolean;
  reason: string | null;
}) {
  if (!isBlacklisted) {
    return (
      <BlacklistToggle customerId={customerId} isBlacklisted={false} />
    );
  }
  return (
    <>
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        {reason}
      </p>
      <BlacklistToggle customerId={customerId} isBlacklisted={true} />
    </>
  );
}
