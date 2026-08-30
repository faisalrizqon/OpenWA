import { redirect } from "next/navigation";
import { Camera, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PortalProductCard } from "@/components/PortalProductCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/SelectField";

export const dynamic = "force-dynamic";

/** Katalog produk untuk customer portal — browse & booking langsung dari portal. */
export default async function PortalCatalogPage({ searchParams }: PageProps<"/portal/catalog">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (!session?.user || session.user.role !== "customer" || !Number.isInteger(customerId) || customerId <= 0) {
    redirect("/portal/login");
  }

  const sp = await searchParams;
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const categoryRaw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const q = (qRaw ?? "").trim().toLowerCase();
  const categoryId = Number(categoryRaw);

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(Number.isInteger(categoryId) && categoryId > 0 ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { sku: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      units: {
        where: { status: { notIn: ["maintenance", "lost"] } },
        select: { id: true, photoPath: true, serialNumber: true },
      },
      images: { orderBy: { sortOrder: "asc" }, select: { filePath: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="size-5 text-primary" aria-hidden />
            Katalog Kamera
          </CardTitle>
          <CardDescription>
            Browse kamera & perlengkapan yang tersedia, lalu booking langsung dari portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter: pencarian + kategori */}
          <form action="/portal/catalog" method="get" className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Cari kamera, merk, atau SKU…"
                className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
            <SelectField
              name="category"
              defaultValue={Number.isInteger(categoryId) && categoryId > 0 ? String(categoryId) : ""}
              triggerClassName="w-[13rem]"
              options={[{ label: "Semua Kategori", value: "" }, ...categories.map((c) => ({ label: c.name, value: String(c.id) }))]}
            />
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Terapkan
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Grid produk */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Search className="size-5" aria-hidden />}
              title="Tidak ada produk ditemukan"
              description={q ? `Tidak ada hasil untuk "${q}". Coba kata kunci lain.` : "Belum ada produk aktif di katalog."}
            />
          </CardContent>
        </Card>
      ) : (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            {products.length} produk tersedia
          </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {products.map((p) => (
              <PortalProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                description={p.description}
                categoryName={p.category.name}
                price6h={p.price6h}
                price12h={p.price12h}
                price24h={p.price24h}
                price48h={p.price48h}
                units={p.units}
                images={p.images}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
