import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  PackageCheck,
  ShieldCheck,
  Check,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getStoreSettings } from "@/lib/content";
import {
  formatRupiah,
  PRICE_TIERS,
  waLink,
  inquiryMessage,
} from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { BookingWidget } from "@/components/BookingWidget";
import { BackLink } from "@/components/BackLink";
import { ExternalLink } from "@/components/LinkButton";
import { ProductGallery } from "@/components/ProductGallery";
export default async function KatalogDetailPage({ params }: PageProps<"/katalog/[id]">) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    include: {
      category: { select: { name: true } },
      units: { where: { status: { notIn: ["maintenance", "lost"] } }, select: { id: true, photoPath: true, serialNumber: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  const shop = await getStoreSettings();
  const unitPhotos = product.units.filter((u) => u.photoPath).slice(0, 4);
  const available = product.units.length;
  const tiers = PRICE_TIERS.map((t) => ({ ...t, price: product[t.key] as number })).filter(
    (t) => t.price > 0
  );
  const message = inquiryMessage(shop.storeName, product.name, product.sku);

  const related = await prisma.product.findMany({
    where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
    take: 3,
    include: { category: { select: { name: true } } },
  });

  // Review customer untuk produk ini (dari order selesai)
  const reviews = await prisma.review.findMany({
    where: {
      order: { status: "completed", items: { some: { productId } } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { customer: { select: { name: true } } },
  });
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <BackLink href="/" label="Kembali ke Katalog" className="mb-6" />


      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3">
          {/* Galeri produk — klik thumbnail untuk ganti foto utama */}
          {product.images.length > 0 ? (
            <ProductGallery images={product.images.map((img) => ({ src: img.filePath, alt: `Foto ${img.id}` }))} />
          ) : (
            <>
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border bg-muted">
                {product.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imagePath}
                    alt={product.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <Camera className="size-24 text-muted-foreground/25" aria-hidden />
                )}
              </div>
              {/* Placeholder grid saat belum ada foto galeri */}
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-xl border bg-muted/60"
                  >
                    <Camera className="size-6 text-muted-foreground/20" aria-hidden />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="text-sm font-medium text-muted-foreground">{product.category.name}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                available > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              <PackageCheck className="size-4" aria-hidden />
              {available > 0 ? `${available} unit siap sewa` : "Stok kosong"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              SKU {product.sku}
            </span>
          </div>

          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Pricing tiers */}
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Pilihan durasi & harga</p>
            {tiers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiers.map((t) => (
                  <div key={t.key} className="rounded-xl border bg-card p-3 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
                    <p className="mt-1 text-base font-bold tracking-tight tabular-nums">
                      {formatRupiah(t.price)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Hubungi kami untuk info harga terbaru.
              </p>
            )}
          </div>

          {/* Reassurance */}
          <ul className="mt-6 space-y-2 text-sm">
            {[
              "Jaminan cukup KTP / kartu pelajar",
              "Unit dicek & dibersihkan sebelum sewa",
              "Bisa antar (COD) area sekitar",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2 text-muted-foreground">
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                {line}
              </li>
            ))}
          </ul>

          {/* Booking widget */}
          <div className="mt-8 space-y-3">
            <BookingWidget
              productId={product.id}
              product={{
                price6h: product.price6h,
                price12h: product.price12h,
                price24h: product.price24h,
                price48h: product.price48h,
              }}
              prices={PRICE_TIERS.map((t) => ({
                label: t.label,
                hours: t.hours,
                price: product[t.key] as number,
              }))}
            />
            <div className="space-y-2 pt-1">
              <ExternalLink
                href={waLink(shop.whatsapp, message)}
                label="Atau pesan langsung via WhatsApp"
                tone="neutral"
                icon={<WhatsAppIcon aria-hidden />}
              />
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden />
                Konfirmasi booking oleh admin pada jam operasional.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews produk */}
      {reviews.length > 0 && (
        <div className="mt-14">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold tracking-tight">
              Review penyewa {product.name}
            </h2>
            {avgRating != null && (
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                {avgRating.toFixed(1)} · {reviews.length} review
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${
                        i < r.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                      }`}
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {r.text ?? "—"}
                </p>
                <p className="mt-2 text-xs font-medium">
                  {r.customer.name}
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {new Date(r.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-4 text-lg font-bold tracking-tight">Produk serupa</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/katalog/${r.id}`}
                className="group flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Camera className="size-6 text-muted-foreground/40" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{r.category.name}</p>
                  <p className="truncate font-medium group-hover:text-primary">{r.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
