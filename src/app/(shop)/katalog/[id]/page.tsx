import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Camera,
  MessageCircle,
  PackageCheck,
  ChevronLeft,
  ShieldCheck,
  Check,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  formatRupiah,
  PRICE_TIERS,
  waLink,
  inquiryMessage,
} from "@/lib/shop";
import { Card, CardContent } from "@/components/ui/card";

export default async function KatalogDetailPage({ params }: PageProps<"/katalog/[id]">) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    include: {
      category: { select: { name: true } },
      units: { where: { status: { notIn: ["maintenance", "lost"] } }, select: { id: true } },
    },
  });
  if (!product) notFound();

  const available = product.units.length;
  const tiers = PRICE_TIERS.map((t) => ({ ...t, price: product[t.key] as number })).filter(
    (t) => t.price > 0
  );
  const message = inquiryMessage(product.name, product.sku);

  const related = await prisma.product.findMany({
    where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
    take: 3,
    include: { category: { select: { name: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <Link
        href="/katalog"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Kembali ke katalog
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border bg-muted">
            <Camera className="size-24 text-muted-foreground/25" aria-hidden />
          </div>
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

          {/* CTA */}
          <div className="mt-auto pt-8">
            <a
              href={waLink(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto"
            >
              <MessageCircle className="size-5" aria-hidden />
              Pesan / Tanya via WhatsApp
            </a>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Balasan cepat pada jam operasional.
            </p>
          </div>
        </div>
      </div>

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
