import Link from "next/link";
import {
  Camera,
  ShieldCheck,
  Clock,
  Wallet,
  ArrowRight,
  PackageCheck,
  Star,
  Play,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { SHOP, formatRupiah, lowestPrice, dailyPrice, waLink, generalMessage, TESTIMONIALS, VIDEO_CONTENT } from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Card, CardContent } from "@/components/ui/card";

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

export default async function KatalogPage() {
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
      {/* Hero */}
      <section className="border-b border-border/70 bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8 md:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Camera className="size-3.5" aria-hidden />
            {SHOP.tagline}
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight md:text-5xl">
            Sewa kamera impianmu, tanpa ribet.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Digicam & kamera pilihan siap dipakai untuk liburan, konten, atau acara spesial.
            Booking cukup lewat WhatsApp — cepat dan gampang.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={waLink(generalMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <WhatsAppIcon aria-hidden />
              Pesan via WhatsApp
            </a>
            <a
              href="#katalog"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Lihat katalog
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="flex items-start gap-3 rounded-2xl border bg-background p-4"
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
        </div>
      </section>

      {/* Katalog */}
      <section id="katalog" className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Katalog Kamera</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length} produk tersedia untuk disewa
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
                        className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-foreground/5"
                      >
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
                              <p className="text-[11px] text-muted-foreground">Mulai dari</p>
                              <p className="text-lg font-bold tracking-tight tabular-nums">
                                {from > 0 ? formatRupiah(from) : "Hubungi kami"}
                              </p>
                              {perDay > 0 && (
                                <p className="text-[11px] text-muted-foreground">
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

      {/* Testimonials */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Kata Mereka yang Sudah Sewa</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sewa ribuan digicam dan kamera dari pelanggan lain</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="border bg-card/50">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="size-4 fill-primary text-primary" aria-hidden />
                  ))}
                </div>
                <p className="text-base leading-relaxed">{t.text}</p>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.context}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Video Content Section */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Video & Tutorial</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tips, review, dan cara booking MudahSewa</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEO_CONTENT.map((v) => (
            <Link href={v.href} key={v.title} className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="aspect-video flex items-center justify-center bg-muted/50 group-hover:bg-accent">
                <Play className="size-12 text-muted-foreground transition-transform duration-300 group-hover:scale-110" aria-hidden />
              </div>
              <div className="space-y-2 p-4">
                <h3 className="text-base font-semibold leading-tight group-hover:text-primary">{v.title}</h3>
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
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
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
