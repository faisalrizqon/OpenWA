import Link from "next/link";
import {
  Camera,
  ShieldCheck,
  Clock,
  Wallet,
  ArrowRight,
  PackageCheck,
  Play,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  SHOP,
  formatRupiah,
  lowestPrice,
  dailyPrice,
  waLink,
  generalMessage,
  TESTIMONIALS,
  VIDEO_CONTENT,
} from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Card, CardContent } from "@/components/ui/card";
import { ShopHero, type HeroVariant } from "@/components/ShopHero";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog — MudahSewa",
  description: "Pilihan kamera & digicam siap sewa dengan harga harian bersahabat.",
};

const PERKS = [
  { icon: Wallet, title: "Harga bersahabat", desc: "Tarif fleksibel 6/12/24/48 jam." },
  { icon: ShieldCheck, title: "Proses aman", desc: "Cukup jaminan KTP / kartu pelajar." },
  { icon: Clock, title: "Cepat & mudah", desc: "Booking langsung via WhatsApp." },
];

const HERO_PRODUCTS = [
  { name: "Kodak FZ55", image: "/images/products/kodak-pixpro-fz55.jpg", timestamp: "23 · 08 · 26" },
  { name: "Canon Ixus", image: "/images/products/canon-ixus.jpg", timestamp: "24 · 07 · 26" },
  { name: "Sony W810", image: "/images/products/sony-cybershot-w810.jpg", timestamp: "22 · 09 · 26" },
  { name: "Canon A4000", image: "/images/products/canon-powershot-a4000.jpg", timestamp: "25 · 06 · 26" },
];

export default async function KatalogPage({ searchParams }: PageProps<"/katalog">) {
  const sp = await searchParams;
  const heroParam = Array.isArray(sp.hero) ? sp.hero[0] : sp.hero;
  const hero: HeroVariant = ["polaroid", "exif", "filmstrip", "stamp", "flip", "grid"].includes(heroParam ?? "")
    ? (heroParam as HeroVariant)
    : "polaroid";

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      units: { where: { status: { notIn: ["maintenance", "lost"] } }, select: { id: true } },
    },
  });

  // Kelompokkan per kategori
  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.category.name;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }
  const categories = Array.from(byCategory.keys());

  return (
    <div>
      {/* Hero (varian: polaroid | exif | filmstrip — via ?hero=) */}
      <ShopHero variant={hero} products={HERO_PRODUCTS} />

      {/* Perks */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-10 md:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <div
                key={perk.title}
                className="flex items-start gap-3 rounded-2xl border bg-card p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">{perk.title}</p>
                  <p className="text-xs text-muted-foreground">{perk.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Katalog */}
      <section id="katalog" className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-primary">
              01 — KATALOG
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              Pilih kameramu
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length} produk tersedia · harga tier per durasi
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
            <Camera className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Belum ada produk</p>
            <p className="text-sm text-muted-foreground">Katalog akan segera diperbarui.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {cat}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {byCategory.get(cat)!.map((p) => {
                    const available = p.units.length;
                    const from = lowestPrice(p);
                    const perDay = dailyPrice(p);
                    return (
                      <Link
                        key={p.id}
                        href={`/katalog/${p.id}`}
                        className="group film-frame-hover flash-hover flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-foreground/10"
                      >
                        {/* Strip film di tepi atas kartu */}
                        <div className="film-sprockets h-4 w-full bg-foreground/85" aria-hidden />
                        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                          {p.imagePath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imagePath}
                              alt={p.name}
                              loading="lazy"
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <Camera
                              className="size-14 text-muted-foreground/30 transition-transform group-hover:scale-110"
                              aria-hidden
                            />
                          )}
                          <span
                            className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              available > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            <PackageCheck className="size-3.5" aria-hidden />
                            {available > 0 ? `${available} unit siap` : "Kosong"}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="text-xs font-medium text-muted-foreground">{p.category.name}</p>
                          <p className="mt-0.5 font-semibold leading-tight group-hover:text-primary">
                            {p.name}
                          </p>
                          {p.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {p.description}
                            </p>
                          )}
                          <div className="mt-auto flex items-end justify-between pt-4">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                mulai dari
                              </p>
                              <p className="text-lg font-bold tracking-tight tabular-nums">
                                {from > 0 ? formatRupiah(from) : "Hubungi kami"}
                              </p>
                              {perDay > 0 && (
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {formatRupiah(perDay)} / 24 jam
                                </p>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                              Detail
                              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials — gaya catatan polaroid */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs font-bold tracking-widest text-primary">
            02 — TESTIMONI
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Kata mereka yang sudah sewa
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Review asli dari pelanggan kami
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              className="note-card polaroid relative rounded-sm"
              style={{ transform: `rotate(${[-2, 1.5, -1][i % 3]}deg)` }}
            >
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
          ))}
        </div>
      </section>

      {/* Video & Tutorial */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs font-bold tracking-widest text-primary">
            03 — KONTEN
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Video & tutorial
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tips, review, dan cara booking di MudahSewa
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEO_CONTENT.map((v) => (
            <Link
              href={v.href}
              key={v.title}
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
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-4 md:px-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              Tidak menemukan yang kamu cari?
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Chat admin kami — kami bantu carikan kamera yang pas dengan kebutuhan & budgetmu.
            </p>
            <a
              href={waLink(generalMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-retro inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <WhatsAppIcon aria-hidden />
              Tanya via WhatsApp
            </a>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
