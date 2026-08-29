import { prisma } from "@/lib/db";
import { createProduct } from "@/actions/products";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/SelectField";

export default async function NewProductPage({
  searchParams,
}: PageProps<"/admin/products/new">) {
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const priceFields: { id: string; label: string }[] = [
    { id: "price6h", label: "Harga 6 Jam" },
    { id: "price12h", label: "Harga 12 Jam" },
    { id: "price24h", label: "Harga 24 Jam" },
    { id: "price48h", label: "Harga 48 Jam" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Produk"
        description="Produk beserta unit fisik dan harga tier"
        backHref="/admin/products"
      />

      {error === "sku" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          SKU sudah dipakai produk lain.
        </p>
      )}
      {error === "invalid" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Data tidak valid — periksa kembali isian form.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Produk Baru</CardTitle>
          <CardDescription>Harga dalam rupiah penuh (mis. 30000)</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProduct} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nama Produk</Label>
              <Input id="name" name="name" required placeholder="mis. Kodak Pixpro FZ55" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" required placeholder="mis. CAM-005" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Kategori</Label>
              <SelectField
                id="categoryId"
                name="categoryId"
                defaultValue={categories[0] ? String(categories[0].id) : undefined}
                placeholder="Pilih kategori"
                options={categories.map((c) => ({ label: c.name, value: String(c.id) }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newCategoryName">Kategori Baru (opsional)</Label>
              <Input
                id="newCategoryName"
                name="newCategoryName"
                placeholder="isi untuk membuat kategori baru, kosongkan bila memakai kategori di atas"
              />
            </div>
            {priceFields.map((f) => (
              <div key={f.id} className="space-y-2">
                <Label htmlFor={f.id}>{f.label}</Label>
                <Input id={f.id} name={f.id} type="number" min="0" defaultValue={0} />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="stockThreshold">Ambang Stok Menipis</Label>
              <Input
                id="stockThreshold"
                name="stockThreshold"
                type="number"
                min="1"
                defaultValue={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chargingRestHours">Jeda Charge/Istirahat (jam)</Label>
              <Input
                id="chargingRestHours"
                name="chargingRestHours"
                type="number"
                min="0"
                max="24"
                defaultValue={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialUnits">Jumlah Unit Awal</Label>
              <Input id="initialUnits" name="initialUnits" type="number" min="1" defaultValue={1} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <textarea
                id="description"
                name="description"
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Simpan Produk</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
