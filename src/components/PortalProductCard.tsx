import Link from "next/link";
import { Camera, PackageCheck, ArrowRight } from "lucide-react";
import { formatRupiah } from "@/lib/pricing";
import { lowestPrice, dailyPrice } from "@/lib/shop";
import { storageUrl } from "@/lib/storage-url";
import { productPhotosOf, type ProductWithPhotos } from "@/lib/productPhotos";

export interface PortalProductCardProps {
  id: number;
  name: string;
  description?: string | null;
  categoryName: string;
  price6h: number;
  price12h: number;
  price24h: number;
  price48h: number;
  units: { id: number; photoPath: string | null; serialNumber?: string | null }[];
  images: { filePath: string }[];
}

/** Kartu produk untuk katalog portal customer — layout sama dengan storefront,
 *  link diarahkan ke halaman katalog portal (bukan publik). */
export function PortalProductCard(p: PortalProductCardProps) {
  const withPhotos: ProductWithPhotos = { units: p.units, images: p.images };
  const { main, previews } = productPhotosOf(withPhotos);
  const available = p.units.length;
  const tiered = { price6h: p.price6h, price12h: p.price12h, price24h: p.price24h, price48h: p.price48h };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/portal/catalog/${p.id}`} className="flex flex-col">
        {/* Foto produk */}
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
          {main ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={storageUrl(main.src)} alt={p.name} className="size-full object-cover" />
          ) : (
            <Camera className="size-12 text-muted-foreground/30" aria-hidden />
          )}

          {/* Badge stok */}
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              available > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            <PackageCheck className="size-3.5" aria-hidden />
            {available > 0 ? `${available} unit siap` : "Kosong"}
          </span>

          {/* Thumbnail preview */}
          {previews.length > 0 && (
            <div className="absolute bottom-2 left-2 flex gap-1.5">
              {previews.slice(0, 3).map((pv, i) => (
                <span
                  key={`${pv.src}-${i}`}
                  className="block size-8 overflow-hidden rounded-md border-2 border-card bg-card shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={storageUrl(pv.src)} alt="" className="size-full object-cover" />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info produk */}
        <div className="flex flex-col p-4 pb-3">
          <p className="text-xs font-medium text-muted-foreground">{p.categoryName}</p>
          <p className="mt-0.5 line-clamp-1 font-semibold leading-tight group-hover:text-primary">
            {p.name}
          </p>
          {p.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
          )}

          <div className="mt-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              mulai dari
            </p>
            <p className="text-lg font-bold tracking-tight tabular-nums">
              {lowestPrice(tiered) > 0 ? formatRupiah(lowestPrice(tiered)) : "Hubungi kami"}
            </p>
            {dailyPrice(tiered) > 0 && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {formatRupiah(dailyPrice(tiered))} / 24 jam
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Tombol sewa */}
      <div className="mt-auto border-t border-border/60 p-3">
        <Link
          href={`/portal/catalog/${p.id}#booking`}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sewa Sekarang
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
