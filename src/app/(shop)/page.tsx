import Image from "next/image";
import Link from "next/link";
import { Camera, ArrowRight, PackageCheck, Play, Star } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { prisma } from "@/lib/db";
import {
  formatRupiah,
  lowestPrice,
  dailyPrice,
  waLink,
  generalMessage,
  getStorefrontData,
} from "@/lib/shop";
import { HERO_VARIANTS } from "@/lib/content";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Card, CardContent } from "@/components/ui/card";
import { ShopHero, type HeroVariant } from "@/components/ShopHero";
import { productPhotosOf } from "@/lib/productPhotos";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const heroParam = Array.isArray(sp.hero) ? sp.hero[0] : sp.hero;

  // Konten dari database (admin → Konten Toko), dengan override ?hero= untuk preview
  const { settings, heroImages, perks, testimonials, videos } = await getStorefrontData();
  const hero: HeroVariant = (HERO_VARIANTS as readonly string[]).includes(heroParam ?? "")
    ? (heroParam as HeroVariant)
    : (settings.heroVariant as HeroVariant);

  const heroProducts = heroImages.map((h) => ({
    name: h.name,
    image: h.imagePath || "",
    timestamp: h.timestamp,
  }));

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      units: { where: { status: { notIn: ["maintenance", "lost"] } }, select: { id: true, photoPath: true, serialNumber: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { filePath: true } },
    },
  });

  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.category.name;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }
  const categories = Array.from(byCategory.keys());

  return (
    <div>
      {/* Hero — konten dari admin */}
      <ShopHero variant={hero} products={heroProducts} settings={settings} perks={perks} />

      {/* Katalog section with reveal animation */}
      <section id="katalog" className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <Reveal delay={0.1}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-bold tracking-widest text-primary">
                01 — KATALOG
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                {settings.catalogTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {products.length} produk tersedia · harga tier per durasi
              </p>
            </div>
          </div>
        </Reveal>

        {products.length === 0 ? (
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
              <Camera className="size-8 text-muted-foreground" aria-hidden />
              <p className="font-medium">Belum ada produk</p>
              <p className="text-sm text-muted-foreground">Katalog akan segera diperbarui.</p>
            </div>
          </Reveal>
        ) : (
          <div className="mt-8 space-y-10">
            {categories.map((cat, catIdx) => (
              <div key={cat} className="category-section">
                <Reveal delay={0.15 + catIdx * 0.08}>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {cat}
                  </h3>
                </Reveal>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {byCategory.get(cat)!.map((p, prodIdx) => {
                    // Jalur foto: upload admin (galeri→unit) = foto utama; sisanya preview kotak kecil
                    const { main, previews } = productPhotosOf(p);
                    return (
                    <Reveal key={p.id} delay={0.2 + catIdx * 0.15 + prodIdx * 0.08}>
                      <div className="group film-frame-hover flash-hover flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-foreground/10">
                        <Link href={`/katalog/${p.id}`} className="flex flex-col">
                          <div className="film-sprockets h-4 w-full bg-foreground/85" aria-hidden />
                          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                            {main ? (
                              <Image
                                src={main.src}
                                alt={`${p.name} — foto produk`}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <Camera
                                className="size-14 text-muted-foreground/30 transition-transform group-hover:scale-110"
                                aria-hidden
                              />
                            )}
                            <span
                              className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                p.units.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              <PackageCheck className="size-3.5" aria-hidden />
                              {p.units.length > 0 ? `${p.units.length} unit siap` : "Kosong"}
                            </span>
                            {/* Preview: sisa foto galeri/unit dari admin panel — kotak kecil di atas foto utama */}
                            {previews.length > 0 && (
                              <div className="absolute bottom-2 left-2 flex gap-1.5">
                                {previews.map((pv) => (
                                  <span
                                    key={pv.src}
                                    className="block size-9 overflow-hidden rounded-md border-2 border-card bg-card shadow-sm sm:size-10"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={pv.src} alt="" className="size-full object-cover" />
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col p-4 pb-3">
                            <p className="text-xs font-medium text-muted-foreground">{p.category.name}</p>
                            <p className="mt-0.5 font-semibold leading-tight group-hover:text-primary">
                              {p.name}
                            </p>
                            {p.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {p.description}
                              </p>
                            )}
                            <div className="mt-3">
                              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                mulai dari
                              </p>
                              <p className="text-lg font-bold tracking-tight tabular-nums">
                                {lowestPrice(p) > 0 ? formatRupiah(lowestPrice(p)) : "Hubungi kami"}
                              </p>
                              {dailyPrice(p) > 0 && (
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {formatRupiah(dailyPrice(p))} / 24 jam
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                        <div className="mt-auto border-t border-border/60 p-3">
                          <Link
                            href={`/checkout?productId=${p.id}`}
                            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            Book Now
                            <ArrowRight className="size-4" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    </Reveal>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials — dari admin */}
      {testimonials.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
          <Reveal delay={0.1}>
            <div className="mb-8 text-center">
              <p className="font-mono text-xs font-bold tracking-widest text-primary">
                02 — TESTIMONI
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                {settings.testimonialTitle}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{settings.testimonialSubtitle}</p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.id} delay={0.2 + i * 0.15}>
                <figure className="note-card polaroid relative rounded-sm">
                  <span className="tape -top-2 left-1/2 -translate-x-1/2 rotate-1" aria-hidden />
                  <div className="space-y-3 px-2 py-3">
                    <div className="flex items-center gap-1">
                      {[...Array(t.rating)].map((_, j) => (
                        <Star key={j} className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                      ))}
                    </div>
                    <blockquote className="text-base leading-relaxed">{t.text}</blockquote>
                    <figcaption className="flex items-baseline justify-between border-t border-dashed pt-2">
                      <span className="font-display text-lg italic">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.context}</span>
                    </figcaption>
                  </div>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Video & Tutorial — dari admin */}
      {videos.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
          <Reveal delay={0.1}>
            <div className="mb-8 text-center">
              <p className="font-mono text-xs font-bold tracking-widest text-primary">
                03 — KONTEN
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                {settings.videoTitle}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{settings.videoSubtitle}</p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v, i) => (
              <Reveal key={v.id} delay={0.2 + i * 0.12}>
                <Link
                  href={v.href}
                  className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative flex aspect-video items-center justify-center bg-foreground/90">
                    <div className="film-sprockets absolute inset-x-0 top-0 h-3 opacity-60" aria-hidden />
                    <span className="btn-retro flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                      <Play className="size-6 fill-current" aria-hidden />
                    </span>
                    <div className="film-sprockets absolute inset-x-0 bottom-0 h-3 opacity-60" aria-hidden />
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="text-base font-semibold leading-tight group-hover:text-primary">
                      {v.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{v.description}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* CTA — teks dari admin */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-4 md:px-8">
        <Reveal delay={0.15}>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">{settings.ctaTitle}</h2>
              <p className="max-w-md text-sm text-muted-foreground">{settings.ctaSubtitle}</p>
              <a
                href={waLink(settings.whatsapp, generalMessage(settings.storeName))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-retro inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <WhatsAppIcon aria-hidden />
                Tanya via WhatsApp
              </a>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
