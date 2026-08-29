import Link from "next/link";
import { Camera } from "lucide-react";
import { formatRupiah, lowestPrice } from "@/lib/shop";
import { storageUrl } from "@/lib/storage-url";
import { productPhotosOf } from "@/lib/productPhotos";

interface RelatedProductCardProps {
  id: number;
  name: string;
  categoryName: string;
  price6h: number;
  price12h: number;
  price24h: number;
  price48h: number;
  units: { id: number; photoPath: string | null; serialNumber?: string | null }[];
  images: { filePath: string }[];
  /** Prefix link tujuan — "/katalog" (publik) atau "/portal/catalog" (portal). */
  hrefPrefix?: string;
}

/** Kartu mini untuk bagian "Produk serupa" — proporsi seimbang: thumbnail
 *  persegi di atas, lalu kategori, nama (maks 2 baris), dan harga mulai.
 *  Gambar mengikuti foto produk asli (jalur productPhotosOf). */
export function RelatedProductCard(p: RelatedProductCardProps) {
  const { main } = productPhotosOf(p);
  const price = lowestPrice(p);

  return (
    <Link
      href={`${p.hrefPrefix ?? "/katalog"}/${p.id}`}
      className="group overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Thumbnail produk — persegi, proporsi tetap di semua ukuran layar */}
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={storageUrl(main.src)}
            alt={p.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Camera className="size-8 text-muted-foreground/30" aria-hidden />
        )}
      </div>

      {/* Info — hierarki jelas: kategori kecil, nama 2 baris, harga menonjol */}
      <div className="space-y-1 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {p.categoryName}
        </p>
        <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug group-hover:text-primary">
          {p.name}
        </p>
        {price > 0 && (
          <p className="text-xs font-semibold text-emerald-700">
            Mulai {formatRupiah(price)}
          </p>
        )}
      </div>
    </Link>
  );
}
