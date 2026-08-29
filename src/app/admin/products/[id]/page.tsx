import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
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

const UNIT_STATUSES: Record<string, { label: string; className: string }> = {
  available: { label: "Tersedia", className: "bg-emerald-100 text-emerald-700" },
  rented: { label: "Dirental", className: "bg-blue-100 text-blue-700" },
  maintenance: { label: "Maintenance", className: "bg-amber-100 text-amber-800" },
  lost: { label: "Hilang", className: "bg-red-100 text-red-700" },
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
  if (error === "file") notifications.push({ type: "error", message: "File tidak valid — hanya JPG/PNG/WebP maksimal 20MB." });
  if (error === "maximages") notifications.push({ type: "error", message: "Maksimal 10 foto galeri per produk." });
  if (error && !["sku", "serial", "invalid", "file", "maximages"].includes(error)) notifications.push({ type: "error", message: decodeURIComponent(error) });
  const priceFields: { key: "price6h" | "price12h" | "price24h" | "price48h"; label: string }[] = [
    { key: "price6h", label: "Harga 6 Jam" },
    { key: "price12h", label: "Harga 12 Jam" },
    { key: "price24h", label: "Harga 24 Jam" },
    { key: "price48h", label: "Harga 48 Jam" },
  ];

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
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Produk ini nonaktif — tidak muncul di katalog dan tidak bisa diorder sampai
          diaktifkan kembali.
        </p>
      )}

      {/* Edit form — admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Produk</CardTitle>
            <CardDescription>Ubah data lalu simpan — harga dalam rupiah penuh</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProduct} className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
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
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Simpan Perubahan</Button>
                <BackLink href="/admin/products" label="Batal" className="h-8 rounded-lg" />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Units */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Fisik</CardTitle>
          <CardDescription>
            {product.units.filter((u) => u.status === "available").length} tersedia ·{" "}
            {product.units.filter((u) => u.status === "rented").length} dirental
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tambah unit — admin only */}
          {isAdmin && (
            <form action={addUnit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <input type="hidden" name="productId" value={product.id} />
              <div className="space-y-1">
                <Label htmlFor="serialNumber">No. Seri (opsional)</Label>
                <Input id="serialNumber" name="serialNumber" placeholder="mis. SN-00123" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="condition">Kondisi</Label>
                <SelectField
                  id="condition"
                  name="condition"
                  defaultValue="Bagus"
                  options={[
                    { label: "Bagus", value: "Bagus" },
                    { label: "Cukup", value: "Cukup" },
                    { label: "Rusak", value: "Rusak" },
                  ]}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="secondary" className="gap-1.5">
                  <Plus className="size-4" aria-hidden />
                  Tambah Unit
                </Button>
              </div>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>No. Seri</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-muted-foreground">{u.id}</TableCell>
                  <TableCell>
                    <UnitPhotoControl
                      unitId={u.id}
                      productId={product.id}
                      photoPath={u.photoPath}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {u.serialNumber ?? "—"}
                  </TableCell>
                  <TableCell>{u.condition}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                        UNIT_STATUSES[u.status]?.className ?? "bg-muted"
                      )}
                    >
                      {UNIT_STATUSES[u.status]?.label ?? u.status}
                    </span>
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <form action={updateUnit} className="flex items-center justify-end gap-1.5">
                        <input type="hidden" name="unitId" value={u.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <SelectField
                          name="condition"
                          defaultValue={u.condition}
                          triggerClassName="h-7 w-24 text-xs"
                          options={[
                            { label: "Bagus", value: "Bagus" },
                            { label: "Cukup", value: "Cukup" },
                            { label: "Rusak", value: "Rusak" },
                          ]}
                        />
                        <SelectField
                          name="status"
                          defaultValue={u.status}
                          triggerClassName="h-7 w-32 text-xs"
                          options={Object.entries(UNIT_STATUSES).map(([value, s]) => ({
                            label: s.label,
                            value,
                          }))}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Simpan
                        </Button>
                      </form>
                      <form action={deleteUnit} className="mt-1 flex justify-end">
                        <input type="hidden" name="unitId" value={u.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={u.status === "rented"}
                        >
                          Hapus Unit
                        </Button>
                      </form>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {product.units.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Belum ada unit fisik — tambah lewat form di atas atau kolom \"Jumlah Unit\"."
                : "Belum ada unit fisik terdaftar."}
            </p>
          )}
        </CardContent>
      </Card>
      {/* Foto Produk — galeri ala marketplace seller, admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Foto Produk</CardTitle>
            <CardDescription>
              Galeri foto yang tampil di katalog publik — maksimal 10 foto. Klik
              foto untuk melihat detail, klik ✕ untuk menghapus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductGalleryControl productId={product.id} images={product.images} />
          </CardContent>
        </Card>
      )}

      {/* Aturan denda keterlambatan — admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Denda Keterlambatan</CardTitle>
            <CardDescription>
              Denda otomatis disarankan di order yang telat kembali. Isi 0 atau matikan untuk
              menonaktifkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveLateFee} className="space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
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
                <div className="space-y-1">
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
                <div className="space-y-1">
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
              <div className="flex justify-end border-t pt-3">
                <Button type="submit" variant="secondary">
                  Simpan Denda
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}


      {/* Riwayat Event Unit (log sewa/return/maintenance) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Event Unit</CardTitle>
          <CardDescription>
            Log event untuk semua unit produk ini — {unitEvents.length} entri
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unitEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
          ) : (
            <div className="space-y-3">
              {unitEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-lg border bg-card p-3 text-sm shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">
                      {evt.event === "rented" && "Unit disewa"}
                      {evt.event === "returned" && "Unit dikembalikan"}
                      {evt.event === "condition" && "Kondisi berubah"}
                      {evt.event === "maintenance" && "Maintenance"}
                      {evt.event === "available" && "Unit kembali tersedia"}
                      {evt.event === "lost" && "Unit hilang"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(evt.createdAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-[auto_auto_auto]">
                    {evt.unit?.serialNumber && (
                      <p>Unit: <span className="font-medium">{evt.unit.serialNumber}</span></p>
                    )}
                    {evt.order?.orderNumber && (
                      <p>Order: <Link href={`/admin/orders/${evt.order.id}`} className="text-primary underline hover:no-underline">{evt.order.orderNumber}</Link></p>
                    )}
                    {(evt.conditionBefore || evt.conditionAfter) && (
                      <>
                        <p>Kondisi: {evt.conditionBefore ?? "—"}</p>
                        <p>→ {evt.conditionAfter ?? "—"}</p>
                      </>
                    )}
                  </div>
                  {evt.note && <p className="mt-1 text-xs italic text-neutral-500">{evt.note}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
