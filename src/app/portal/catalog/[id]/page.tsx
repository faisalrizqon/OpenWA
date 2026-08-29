import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Check, PackageCheck, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStoreSettings } from "@/lib/content";
import { formatRupiah } from "@/lib/pricing";
import { PRICE_TIERS, waLink, inquiryMessage } from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { BookingWidget } from "@/components/BookingWidget";
import { ExternalLink } from "@/components/LinkButton";
import { ProductGallery } from "@/components/ProductGallery";
import { productPhotosOf } from "@/lib/productPhotos";
import { RelatedProductCard } from "@/components/RelatedProductCard";
import { storageUrl } from "@/lib/storage-url";

export const dynamic = "force-dynamic";

/** Detail produk katalog portal customer — info produk + booking langsung. */
export default async function PortalCatalogDetailPage({ params }: PageProps<"/portal/catalog/[id]">) {
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

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    include: {
      category: { select: { name: true } },
      units: { select: { id: true, photoPath: true, serialNumber: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  const shop = await getStoreSettings();
  const { main, previews } = productPhotosOf(product);
  const galleryImages = main ? [main, ...previews] : [];
  const available = product.units.length;
  const tiers = PRICE_TIERS.map((t) => ({ ...t, price: product[t.key] as number })).filter(
    (t) => t.price > 0
  );
  const message = inquiryMessage(shop.storeName, product.name, product.sku);

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

  const related = await prisma.product.findMany({
    where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
    take: 3,
    include: {
      category: { select: { name: true } },
      // Foto untuk kartu "Produk serupa" — jalur sama dengan PortalProductCard
      units: { select: { id: true, photoPath: true, serialNumber: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/portal/catalog"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Katalog
      </Link>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3">
          {galleryImages.length > 0 ? (
            <ProductGallery images={galleryImages} />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted/60">
              <Camera className="size-12 text-muted-foreground/30" aria-hidden />
            </div>
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

          {/* Booking widget — cek ketersediaan real-time lalu lanjut ke checkout */}
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
              checkoutPath="/portal/checkout"
              catalogPath="/portal/catalog"
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
                <p className="mt-2 text-sm text-muted-foreground">{r.text ?? "—"}</p>
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

      {/* Produk serupa — ukuran compact default, thumbnail foto mengikuti produk */}
      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-4 text-lg font-bold tracking-tight">Produk serupa</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <RelatedProductCard
                key={r.id}
                id={r.id}
                name={r.name}
                categoryName={r.category.name}
                price6h={r.price6h}
                price12h={r.price12h}
                price24h={r.price24h}
                price48h={r.price48h}
                units={r.units ?? []}
                images={r.images ?? []}
                hrefPrefix="/portal/catalog"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
