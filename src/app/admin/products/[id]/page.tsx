import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  Plus,
  Undo2,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { BackLink } from "@/components/BackLink";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/SelectField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateProduct,
  toggleProductActive,
  addUnit,
  updateUnit,
  deleteUnit,
  saveLateFee,
} from "@/actions/products";
import { UnitPhotoControl } from "@/components/UnitPhotoControl";
import { ProductGalleryControl } from "@/components/ProductGalleryControl";
import { DeleteProductDialog } from "@/components/ProductAdminActions";
import { cn } from "@/lib/utils";

const UNIT_STATUSES: Record<string, { label: string; className: string; dot: string }> = {
  available: {
    label: "Tersedia",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  rented: {
    label: "Dirental",
    className: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20",
    dot: "bg-blue-500",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  lost: {
    label: "Hilang",
    className: "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20",
    dot: "bg-red-500",
  },
};

const CONDITION_OPTIONS = [
  { label: "Bagus", value: "Bagus" },
  { label: "Cukup", value: "Cukup" },
  { label: "Rusak", value: "Rusak" },
];

/** Metadata event unit untuk timeline riwayat — ikon, warna accent, dan label. */
const EVENT_META: Record<string, { label: string; icon: typeof CalendarClock; accent: string }> = {
  rented: { label: "Unit disewa", icon: CalendarClock, accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  returned: { label: "Unit dikembalikan", icon: Undo2, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  condition: { label: "Kondisi berubah", icon: AlertTriangle, accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  maintenance: { label: "Maintenance", icon: Wrench, accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  available: { label: "Unit tersedia lagi", icon: CheckCircle2, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  lost: { label: "Unit hilang", icon: Ban, accent: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

export default async function ProductDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const [product, unitEvents, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, units: { orderBy: { id: "asc" } }, images: { orderBy: { sortOrder: "asc" } }, lateFee: true },
    }),
    // Riwayat event unit fisik produk ini (50 terbaru)
    prisma.unitEvent.findMany({
      where: { unit: { productId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        order: { select: { id: true, orderNumber: true } },
        unit: { select: { serialNumber: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";


  const notifications: PageNotification[] = [];
  if (error === "sku") notifications.push({ type: "error", message: "SKU sudah dipakai produk lain." });
  if (error === "serial") notifications.push({ type: "error", message: "Nomor seri sudah dipakai unit lain." });
  if (error === "invalid") notifications.push({ type: "error", message: "Data tidak valid — periksa kembali isian form." });
  if (error === "file") notifications.push({ type: "error", message: "File tidak valid — maksimal 15MB (file di atas 3MB dikompres otomatis)." });
  if (error === "maximages") notifications.push({ type: "error", message: "Maksimal 10 foto galeri per produk." });
  if (error && !["sku", "serial", "invalid", "file", "maximages"].includes(error)) notifications.push({ type: "error", message: decodeURIComponent(error) });
  const priceFields: { key: "price6h" | "price12h" | "price24h" | "price48h"; label: string }[] = [
    { key: "price6h", label: "Harga 6 Jam" },
    { key: "price12h", label: "Harga 12 Jam" },
    { key: "price24h", label: "Harga 24 Jam" },
    { key: "price48h", label: "Harga 48 Jam" },
  ];

  const availableCount = product.units.filter((u) => u.status === "available").length;
  const rentedCount = product.units.filter((u) => u.status === "rented").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.sku} · ${product.category.name} · ${product.units.length} unit`}
        backHref="/admin/products"
        action={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <form action={toggleProductActive}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="active" value={product.active ? "false" : "true"} />
                <Button type="submit" variant="outline" size="sm">
                  {product.active ? "Sembunyikan dari Katalog" : "Tampilkan di Katalog"}
                </Button>
              </form>
              <DeleteProductDialog
                productId={product.id}
                productName={product.name}
              />
            </div>
          ) : undefined
        }
      />

      <PageNotifier notifications={notifications} />

      {!product.active && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Produk ini nonaktif — tidak muncul di katalog dan tidak bisa diorder sampai
            diaktifkan kembali.
          </p>
        </div>
      )}

      {/* Edit form — admin only */}
      {isAdmin && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold tracking-tight">Edit Produk</CardTitle>
            <CardDescription>Ubah data lalu simpan — harga dalam rupiah penuh</CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form action={updateProduct} className="grid gap-5 sm:grid-cols-2">
              <input type="hidden" name="productId" value={product.id} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nama Produk</Label>
                <Input id="name" name="name" required defaultValue={product.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" required defaultValue={product.sku} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Kategori</Label>
                <SelectField
                  id="categoryId"
                  name="categoryId"
                  defaultValue={String(product.categoryId)}
                  options={categories.map((c) => ({ label: c.name, value: String(c.id) }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="newCategoryName">Kategori Baru (opsional)</Label>
                <Input
                  id="newCategoryName"
                  name="newCategoryName"
                  placeholder="isi hanya jika ingin membuat kategori baru"
                />
              </div>

              {/* Harga sewa — dikelompokkan dalam satu baris grid agar rapi */}
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Harga Sewa
                </p>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {priceFields.map((f) => (
                    <div key={f.key} className="space-y-2">
                      <Label htmlFor={f.key}>{f.label}</Label>
                      <Input
                        id={f.key}
                        name={f.key}
                        type="number"
                        min="0"
                        defaultValue={product[f.key]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockThreshold">Ambang Stok Menipis</Label>
                <Input
                  id="stockThreshold"
                  name="stockThreshold"
                  type="number"
                  min="1"
                  defaultValue={product.stockThreshold}
                />
                <p className="text-xs text-muted-foreground">Notifikasi bila unit tersedia tinggal sedikit</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chargingRestHours">Jeda Charge/Istirahat (jam)</Label>
                <Input
                  id="chargingRestHours"
                  name="chargingRestHours"
                  type="number"
                  min="0"
                  max="24"
                  defaultValue={product.chargingRestHours ?? 3}
                />
                <p className="text-xs text-muted-foreground">Unit tidak bisa langsung disewa lagi setelah pengembalian — butuh waktu untuk charge & istirahat (default 3 jam)</p>
              </div>
              <div className="space-y-2 rounded-xl bg-muted/40 p-4 sm:col-span-2">
                <p className="text-sm font-medium">Jumlah Unit: {product.units.length}</p>
                <p className="text-xs text-muted-foreground">
                  Kelola jumlah unit lewat card <span className="font-medium">Unit Fisik</span> di
                  bawah (tambah/hapus per unit) — tidak lewat form ini, agar tidak
                  saling mengintervensi.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Deskripsi (opsional)</Label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={product.description ?? ""}
                  className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Simpan Perubahan</Button>
                <BackLink href="/admin/products" label="Batal" className="h-9 rounded-lg" />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Units */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <CardTitle className="text-base font-semibold tracking-tight">Unit Fisik</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", UNIT_STATUSES.available.dot)} aria-hidden />
              {availableCount} tersedia
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", UNIT_STATUSES.rented.dot)} aria-hidden />
              {rentedCount} dirental
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          {/* Tambah unit — admin only */}
          {isAdmin && (
            <form action={addUnit} className="space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid gap-4 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="serialNumber">No. Seri (opsional)</Label>
                  <Input id="serialNumber" name="serialNumber" placeholder="mis. SN-00123" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="condition">Kondisi</Label>
                  <SelectField
                    id="condition"
                    name="condition"
                    defaultValue="Bagus"
                    options={CONDITION_OPTIONS}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" className="gap-1.5">
                  <Plus className="size-4" aria-hidden />
                  Tambah Unit
                </Button>
              </div>
            </form>
          )}


          {product.units.length === 0 ? (
            <div className="flex min-h-24 w-full items-center justify-center rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {isAdmin
                ? "Belum ada unit fisik — tambah lewat form di atas."
                : "Belum ada unit fisik terdaftar."}
            </div>
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12 pl-4">#</TableHead>
                    <TableHead className="w-40">Foto</TableHead>
                    <TableHead>No. Seri</TableHead>
                    <TableHead className="w-28">Kondisi</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    {isAdmin && (
                      <TableHead className="pr-4 text-right whitespace-nowrap">Aksi</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">{u.id}</TableCell>
                      <TableCell>
                        <UnitPhotoControl unitId={u.id} productId={product.id} photoPath={u.photoPath} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{u.serialNumber ?? "—"}</TableCell>
                      <TableCell>
                        <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground">
                          {u.condition}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium", UNIT_STATUSES[u.status]?.className ?? "bg-muted text-muted-foreground")}>
                          <span className={cn("size-1.5 rounded-full", UNIT_STATUSES[u.status]?.dot ?? "bg-muted-foreground")} aria-hidden />
                          {UNIT_STATUSES[u.status]?.label ?? u.status}
                        </span>
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="pr-4">
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <form action={updateUnit} className="flex shrink-0 items-center gap-1.5">
                              <input type="hidden" name="unitId" value={u.id} />
                              <input type="hidden" name="productId" value={product.id} />
                              <SelectField name="condition" defaultValue={u.condition} triggerClassName="h-8 w-20 text-xs" options={CONDITION_OPTIONS} />
                              <SelectField name="status" defaultValue={u.status} triggerClassName="h-8 w-28 text-xs" options={Object.entries(UNIT_STATUSES).map(([value, s]) => ({ label: s.label, value }))} />
                              <Button type="submit" variant="outline" size="sm" className="h-8 w-20">Simpan</Button>
                            </form>
                            <form action={deleteUnit} className="shrink-0">
                              <input type="hidden" name="unitId" value={u.id} />
                              <input type="hidden" name="productId" value={product.id} />
                              <Button type="submit" variant="ghost" size="sm" className="h-8 w-16 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={u.status === "rented"}>Hapus</Button>
                            </form>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Foto Produk — galeri ala marketplace seller, admin only */}
      {isAdmin && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold tracking-tight">Foto Produk</CardTitle>
            <CardDescription>
              Galeri foto yang tampil di katalog publik — maksimal 10 foto. Klik
              foto untuk melihat detail, klik ✕ untuk menghapus.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <ProductGalleryControl productId={product.id} images={product.images} />
          </CardContent>
        </Card>
      )}

      {/* Aturan denda keterlambatan — admin only */}
      {isAdmin && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold tracking-tight">Denda Keterlambatan</CardTitle>
            <CardDescription>
              Denda otomatis disarankan di order yang telat kembali. Isi 0 atau matikan untuk
              menonaktifkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form action={saveLateFee} className="space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="feePerDay">Denda per hari (Rp)</Label>
                  <Input
                    id="feePerDay"
                    name="feePerDay"
                    type="number"
                    min="0"
                    step="1000"
                    defaultValue={product.lateFee?.feePerDay ?? 0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="graceHours">Masa tenggang (jam)</Label>
                  <Input
                    id="graceHours"
                    name="graceHours"
                    type="number"
                    min="0"
                    defaultValue={product.lateFee?.graceHours ?? 0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Setelah lewat masa tenggang, denda mulai dihitung per hari.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lateFeeActive">Status</Label>
                  <SelectField
                    id="lateFeeActive"
                    name="active"
                    defaultValue={product.lateFee?.active !== false ? "true" : "false"}
                    options={[
                      { label: "Aktif", value: "true" },
                      { label: "Nonaktif", value: "false" },
                    ]}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-border/60 pt-4">
                <Button type="submit" variant="secondary">
                  Simpan Denda
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Riwayat Event Unit (log sewa/return/maintenance) */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <CardTitle className="text-base font-semibold tracking-tight">Riwayat Event Unit</CardTitle>
          <CardDescription>
            Log event untuk semua unit produk ini — {unitEvents.length} entri
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {unitEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Belum ada riwayat.
            </div>
          ) : (
            <ol className="relative space-y-3">
              {unitEvents.map((evt) => {
                const meta = EVENT_META[evt.event];
                const Icon = meta?.icon ?? CalendarClock;
                return (
                  <li
                    key={evt.id}
                    className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        meta?.accent ?? "bg-muted text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {meta?.label ?? evt.event}
                        </p>
                        <time className="text-xs tabular-nums text-muted-foreground">
                          {new Date(evt.createdAt).toLocaleString("id-ID")}
                        </time>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {evt.unit?.serialNumber && (
                          <span>
                            Unit:{" "}
                            <span className="font-mono font-medium text-foreground">
                              {evt.unit.serialNumber}
                            </span>
                          </span>
                        )}
                        {evt.order?.orderNumber && (
                          <span>
                            Order:{" "}
                            <Link
                              href={`/admin/orders/${evt.order.id}`}
                              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                            >
                              {evt.order.orderNumber}
                              <ArrowRight className="size-3" aria-hidden />
                            </Link>
                          </span>
                        )}
                        {(evt.conditionBefore || evt.conditionAfter) && (
                          <span className="inline-flex items-center gap-1">
                            Kondisi: {evt.conditionBefore ?? "—"}
                            <ArrowRight className="size-3 opacity-60" aria-hidden />
                            <span className="font-medium text-foreground">
                              {evt.conditionAfter ?? "—"}
                            </span>
                          </span>
                        )}
                      </div>
                      {evt.note && (
                        <p className="mt-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs italic text-muted-foreground">
                          {evt.note}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
