import { ArrowRight, Star, ShieldCheck, Clock, Wallet } from "lucide-react";
import { SHOP, waLink, generalMessage } from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { cn } from "@/lib/utils";

export type HeroVariant = "polaroid" | "exif" | "filmstrip" | "stamp" | "flip" | "grid" | "sticker";

interface HeroProduct {
  name: string;
  image: string;
  timestamp: string;
}

interface ShopHeroProps {
  variant: HeroVariant;
  products: HeroProduct[];
}

/** Tinggi hero kompak — tidak satu layar penuh, katalog mulai terlihat. */
const HERO_MIN_H = "min-h-[52dvh]";

const PERKS = [
  { icon: Wallet, title: "Harga bersahabat", desc: "Tarif fleksibel 6/12/24/48 jam." },
  { icon: ShieldCheck, title: "Proses aman", desc: "Cukup jaminan KTP / kartu pelajar." },
  { icon: Clock, title: "Cepat & mudah", desc: "Booking langsung via WhatsApp." },
];

/** Kartu keunggulan — flow normal tepat di bawah hero (tidak overlap),
 *  muncul dengan animasi fade-up berurutan. */
function HeroPerks() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-8 md:px-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {PERKS.map((perk, i) => {
          const Icon = perk.icon;
          return (
            <div
              key={perk.title}
              className="group flex animate-fade-up items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-md shadow-foreground/5 transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${0.15 + i * 0.12}s` }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-bold">{perk.title}</p>
                <p className="text-xs text-muted-foreground">{perk.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CtaButtons({ size = "lg" }: { size?: "lg" | "md" }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={waLink(generalMessage())}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "btn-retro inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition-colors hover:bg-emerald-700",
          size === "lg" ? "h-12 text-sm md:text-base" : "h-10 text-sm"
        )}
      >
        <WhatsAppIcon aria-hidden />
        Pesan via WhatsApp
      </a>
      <a
        href="#katalog"
        className={cn(
          "btn-retro inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 font-semibold transition-colors hover:bg-accent",
          size === "lg" ? "h-12 text-sm md:text-base" : "h-10 text-sm"
        )}
      >
        Lihat katalog
        <ArrowRight className="size-4" aria-hidden />
      </a>
    </div>
  );
}

function TrustChips() {
  return (
    <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
        Jaminan KTP / kartu pelajar
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5 text-emerald-600" aria-hidden />
        {SHOP.hours}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
        Dipercaya pelajar Weleri
      </span>
    </div>
  );
}

/* ---------- Varian A: Polaroid Collage (foto melayang pelan) ---------- */
function PolaroidHero({ products }: { products: HeroProduct[] }) {
  const rotations = ["-6deg", "4deg", "-3deg", "7deg"];
  const offsets = [
    "top-0 left-2 md:-left-4",
    "top-10 right-0 md:right-6",
    "top-36 left-8 md:left-16",
    "top-40 right-4 md:right-10",
  ];
  return (
    <section className={cn("flex items-center overflow-hidden py-10", HERO_MIN_H)}>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:px-8">
        <div className="space-y-5">
          <span className="animate-fade-up digicam-timestamp text-sm">
            {"'"}26 · 08 · 23 &nbsp;AM 10:24
          </span>
          <h1
            className="animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
            style={{ animationDelay: "0.08s" }}
          >
            Sewa kamera{" "}
            <span className="font-display italic font-normal text-primary">impianmu</span>,
            tanpa ribet.
          </h1>
          <p
            className="animate-fade-up max-w-md text-base text-muted-foreground md:text-lg"
            style={{ animationDelay: "0.16s" }}
          >
            Digicam & kamera pilihan siap dipakai untuk liburan, konten, atau acara spesial.
            Booking cukup lewat WhatsApp — cepat dan gampang.
          </p>
          <div className="animate-fade-up" style={{ animationDelay: "0.24s" }}>
            <CtaButtons />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "0.32s" }}>
            <TrustChips />
          </div>
        </div>

        {/* Polaroid collage — tiap foto melayang pelan dengan fase berbeda */}
        <div className="relative mx-auto hidden h-[420px] w-full max-w-md md:block">
          {products.slice(0, 4).map((p, i) => (
            <figure
              key={p.name}
              className={cn("animate-fade-in polaroid absolute w-48", offsets[i])}
              style={{
                transform: `rotate(${rotations[i]})`,
                animationDelay: `${0.2 + i * 0.15}s`,
              }}
            >
              <span className="tape -top-2 left-1/2 -translate-x-1/2 -rotate-2" aria-hidden />
              <div className="animate-float" style={{ animationDelay: `${i * 0.7}s` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="mt-2 flex items-baseline justify-between px-1">
                  <span className="text-xs font-semibold">{p.name}</span>
                  <span className="digicam-timestamp text-[10px]">{p.timestamp}</span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Varian B: Produk besar + EXIF chips (zoom pelan) ---------- */
function ExifHero({ products }: { products: HeroProduct[] }) {
  const featured = products[0];
  const chips = [
    { label: "ISO 400", pos: "top-6 -left-2 md:-left-6" },
    { label: "f/2.8", pos: "top-24 -right-3 md:-right-8" },
    { label: "3.2 MP", pos: "bottom-16 -left-3 md:-left-8" },
    { label: "AUTO ⚡︎", pos: "-bottom-3 right-6" },
  ];
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="space-y-5">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Star className="size-3.5 fill-current" aria-hidden />
            Digicam paling dicari bulan ini
          </span>
          <h1
            className="animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
            style={{ animationDelay: "0.08s" }}
          >
            Hasil foto{" "}
            <span className="font-display italic font-normal text-primary">aesthetic</span>{" "}
            mulai Rp30 ribu.
          </h1>
          <p
            className="animate-fade-up max-w-md text-base text-muted-foreground md:text-lg"
            style={{ animationDelay: "0.16s" }}
          >
            Semua unit dicek & dibersihkan sebelum sewa. Pilih tanggal, durasi, dan metode
            bayar — sisanya biar kami yang urus.
          </p>
          <div className="animate-fade-up" style={{ animationDelay: "0.24s" }}>
            <CtaButtons />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "0.32s" }}>
            <TrustChips />
          </div>
        </div>

        <div className="animate-fade-in relative mx-auto w-full max-w-sm" style={{ animationDelay: "0.2s" }}>
          <div className="overflow-hidden rounded-3xl border bg-card shadow-xl shadow-foreground/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.image}
              alt={featured.name}
              className="animate-kenburns aspect-[4/3] w-full object-cover"
            />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">{featured.name}</span>
              <span className="digicam-timestamp text-xs">{featured.timestamp}</span>
            </div>
          </div>
          {chips.map((c, i) => (
            <span
              key={c.label}
              className={cn(
                "animate-pop absolute rounded-full border bg-card px-3 py-1.5 font-mono text-xs font-bold shadow-md",
                c.pos
              )}
              style={{ animationDelay: `${0.4 + i * 0.12}s` }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Varian C: Minimalis + film strip marquee ---------- */
function FilmStripHero({ products }: { products: HeroProduct[] }) {
  const frames = [...products, ...products]; // duplikasi untuk loop mulus
  return (
    <section className={cn("flex flex-col", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-10 text-center md:px-8">
        <span className="animate-fade-up digicam-timestamp text-sm">
          ▶ PLAY &nbsp;·&nbsp; RENT · ROLL · REPEAT
        </span>
        <h1
          className="animate-fade-up mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
          style={{ animationDelay: "0.08s" }}
        >
          Satu roll penuh{" "}
          <span className="font-display italic font-normal text-primary">kenangan</span>.
        </h1>
        <p
          className="animate-fade-up mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg"
          style={{ animationDelay: "0.16s" }}
        >
          Rental digicam harian harga pelajar. Booking online, ambil unit, jepret, kembalikan —
          semudah itu.
        </p>
        <div className="animate-fade-up mt-6 flex justify-center" style={{ animationDelay: "0.24s" }}>
          <CtaButtons size="md" />
        </div>
        <div className="animate-fade-up mt-4 flex justify-center" style={{ animationDelay: "0.32s" }}>
          <TrustChips />
        </div>
      </div>

      {/* Film strip marquee */}
      <div className="mt-auto overflow-hidden bg-foreground py-3">
        <div className="film-sprockets h-3 w-full opacity-70" />
        <div className="film-strip-track gap-3 py-3">
          {frames.map((p, i) => (
            <figure key={`${p.name}-${i}`} className="relative w-56 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                className="aspect-[3/2] w-full rounded-sm object-cover"
              />
              <figcaption className="digicam-timestamp absolute bottom-1 right-2 text-[10px]">
                {p.timestamp}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="film-sprockets h-3 w-full opacity-70" />
      </div>
    </section>
  );
}

/* ---------- Varian D: Timestamp banner ala viewfinder ---------- */
function StampHero({ products }: { products: HeroProduct[] }) {
  const featured = products[0];
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="animate-fade-up digicam-timestamp inline-flex items-center gap-2 rounded-lg border border-current/30 px-3 py-1.5 text-sm">
              <span className="animate-blink size-2 rounded-full bg-current" aria-hidden />
              REC &nbsp;·&nbsp; {"'"}26 08 23 10:24
            </div>
            <h1
              className="animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              Abadikan momen,{" "}
              <span className="font-display italic font-normal text-primary">
                tanpa beli kamera
              </span>
              .
            </h1>
            <p
              className="animate-fade-up max-w-md text-base text-muted-foreground md:text-lg"
              style={{ animationDelay: "0.16s" }}
            >
              Rental harian mulai Rp30 ribu. Booking online, bayar fleksibel, ambil unit —
              semua beres dalam hitungan menit.
            </p>
            <div className="animate-fade-up" style={{ animationDelay: "0.24s" }}>
              <CtaButtons />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "0.32s" }}>
              <TrustChips />
            </div>
          </div>

          {/* Viewfinder frame berisi foto produk */}
          <div className="animate-fade-in relative" style={{ animationDelay: "0.2s" }}>
            <div className="group relative overflow-hidden rounded-3xl border-2 border-foreground/20 bg-foreground/5 p-4">
              <span className="viewfinder-corner left-2 top-2 border-l-2 border-t-2" />
              <span className="viewfinder-corner right-2 top-2 border-r-2 border-t-2" />
              <span className="viewfinder-corner bottom-2 left-2 border-b-2 border-l-2" />
              <span className="viewfinder-corner bottom-2 right-2 border-b-2 border-r-2" />
              <div className="flash-hover overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.image}
                  alt={featured.name}
                  className="animate-kenburns aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between px-2">
                <span className="text-sm font-semibold">{featured.name}</span>
                <span className="digicam-timestamp text-xs">{featured.timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Varian E: 3D flip cards ---------- */
function FlipHero({ products }: { products: HeroProduct[] }) {
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 text-center md:px-8">
        <h1 className="animate-fade-up mx-auto max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">
          Sentuh untuk{" "}
          <span className="font-display italic font-normal text-primary">memilih</span> kameramu
        </h1>
        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl text-base text-muted-foreground"
          style={{ animationDelay: "0.1s" }}
        >
          Arahkan kursor ke kartu untuk melihat detail unit — semua siap sewa hari ini.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p, i) => (
            <div
              key={p.name}
              className="animate-fade-in flip-scene h-56 md:h-60"
              style={{ animationDelay: `${0.2 + i * 0.12}s` }}
            >
              <div
                className="flip-card h-full"
                style={{ transform: `rotate(${[-1.5, 1, -0.8, 1.2][i % 4]}deg)` }}
              >
                {/* Depan: foto kamera */}
                <div className="flip-face overflow-hidden rounded-2xl border bg-card shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="size-full object-cover" />
                </div>
                {/* Belakang: info + timestamp */}
                <div className="flip-face flip-back flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-5 shadow-md">
                  <span className="digicam-timestamp text-xs">{p.timestamp}</span>
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Ready · cek & bersihkan sebelum sewa
                  </p>
                  <a
                    href="#katalog"
                    className="btn-retro mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
                  >
                    Lihat katalog
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="animate-fade-up mt-8 flex justify-center" style={{ animationDelay: "0.5s" }}>
          <CtaButtons size="md" />
        </div>
      </div>
    </section>
  );
}

/* ---------- Varian F: Camera wall grid ---------- */
function GridHero({ products }: { products: HeroProduct[] }) {
  const wall = [...products, ...products.slice(0, 2)];
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="order-2 grid grid-cols-3 gap-3 lg:order-1">
            {wall.map((p, i) => (
              <figure
                key={`${p.name}-${i}`}
                className={cn(
                  "animate-fade-in flash-hover group relative overflow-hidden rounded-xl border shadow-sm",
                  i % 2 === 0 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]",
                  i === 2 && "col-span-2 row-span-2"
                )}
                style={{ animationDelay: `${0.2 + i * 0.08}s` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className={cn(
                    "w-full object-cover transition-transform duration-300 group-hover:scale-105",
                    i === 2 ? "aspect-square" : "aspect-[3/2]"
                  )}
                />
                <figcaption className="digicam-timestamp absolute bottom-1.5 right-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                  {p.timestamp}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="order-1 space-y-5 lg:order-2">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Star className="size-3.5 fill-current" aria-hidden />
              {products.length}+ unit kamera siap pakai
            </span>
            <h1
              className="animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              Dinding kamera,{" "}
              <span className="font-display italic font-normal text-primary">
                satu klik away
              </span>
              .
            </h1>
            <p
              className="animate-fade-up max-w-md text-base text-muted-foreground md:text-lg"
              style={{ animationDelay: "0.16s" }}
            >
              Semua unit kami rawat seperti milik sendiri. Scroll katalog, pilih favoritmu,
              dan booking sebelum keduluan yang lain.
            </p>
            <div className="animate-fade-up" style={{ animationDelay: "0.24s" }}>
              <CtaButtons />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "0.32s" }}>
              <TrustChips />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Varian G: Cute sticker wall ---------- */
function StickerHero({ products }: { products: HeroProduct[] }) {
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 text-center md:px-8">
        <h1 className="animate-fade-up mx-auto max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">
          Pilih kamera,{" "}
          <span className="font-display italic font-normal text-primary">
            tempel stiker favoritmu
          </span>{" "}
          💖
        </h1>
        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl text-base text-muted-foreground"
          style={{ animationDelay: "0.1s" }}
        >
          Semua kamera kami siap pakai — tinggal pilih, booking, dan ambil. Simpel banget!
        </p>

        {/* Sticker wall grid — tiap stiker goyang halus */}
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p, i) => (
            <figure
              key={p.name}
              className="animate-pop sticker-card relative overflow-hidden rounded-2xl border bg-card shadow-md"
              style={{
                transform: `rotate(${[-1.5, 1, -0.8, 1.2][i % 4]}deg)`,
                animationDelay: `${0.2 + i * 0.12}s`,
              }}
            >
              <span className="washi-tape" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
              <figcaption className="px-3 py-3">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="digicam-timestamp text-xs opacity-70">{p.timestamp}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="animate-fade-up mt-8 flex justify-center" style={{ animationDelay: "0.5s" }}>
          <CtaButtons size="md" />
        </div>
      </div>
    </section>
  );
}

export function ShopHero({ variant, products }: ShopHeroProps) {
  let hero: React.ReactNode;
  if (variant === "exif") hero = <ExifHero products={products} />;
  else if (variant === "filmstrip") hero = <FilmStripHero products={products} />;
  else if (variant === "stamp") hero = <StampHero products={products} />;
  else if (variant === "flip") hero = <FlipHero products={products} />;
  else if (variant === "grid") hero = <GridHero products={products} />;
  else if (variant === "sticker") hero = <StickerHero products={products} />;
  else hero = <PolaroidHero products={products} />;

  return (
    <div>
      {hero}
      {/* Kartu keunggulan: flow normal di bawah hero, animasi fade-up berurutan */}
      <HeroPerks />
    </div>
  );
}
