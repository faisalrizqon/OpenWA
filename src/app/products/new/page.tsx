import Link from "next/link";
import { prisma } from "@/lib/db";
import { createProduct } from "@/actions/products";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function NewProductPage({
  searchParams,
}: PageProps<"/products/new">) {
  const { error } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-4 space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Produk</h1>
        <p className="mt-1 text-sm text-zinc-500">
          <Link href="/products" className="hover:underline">
            ← Kembali ke daftar produk
          </Link>
        </p>
      </div>

      {error === "sku" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          SKU sudah dipakai
        </p>
      )}
      {error === "invalid" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Data tidak valid — periksa kembali isian form
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Produk Baru</CardTitle>
          <CardDescription>Harga tier: 6 / 12 / 24 / 48 jam (rupiah penuh)</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProduct} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Produk</Label>
              <Input id="name" name="name" required placeholder="mis. Kodak Pixpro FZ55" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" required placeholder="mis. CAM-005" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Kategori</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue={categories[0]?.id ?? ""}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCategoryName">Kategori Baru (opsional)</Label>
              <Input
                id="newCategoryName"
                name="newCategoryName"
                placeholder="isi untuk membuat kategori baru"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price6h">Harga 6 Jam</Label>
              <Input id="price6h" name="price6h" type="number" min="0" defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price12h">Harga 12 Jam</Label>
              <Input id="price12h" name="price12h" type="number" min="0" defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price24h">Harga 24 Jam</Label>
              <Input id="price24h" name="price24h" type="number" min="0" defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price48h">Harga 48 Jam</Label>
              <Input id="price48h" name="price48h" type="number" min="0" defaultValue={0} />
            </div>
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
              <Label htmlFor="initialUnits">Jumlah Unit Awal</Label>
              <Input id="initialUnits" name="initialUnits" type="number" min="1" defaultValue={1} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <textarea
                id="description"
                name="description"
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Simpan Produk</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
